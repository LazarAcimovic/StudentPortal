using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StudentPortal.Configuration;
using StudentPortal.Dtos;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ILogger<AuthService> _logger;
    private readonly TokenLifetimeOptions _lifetimes;

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IRefreshTokenRepository refreshTokenRepository,
        ILogger<AuthService> logger,
        IOptions<TokenLifetimeOptions> lifetimes)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _refreshTokenRepository = refreshTokenRepository;
        _logger = logger;
        _lifetimes = lifetimes.Value;
    }

    public async Task<AuthResult?> AuthenticateAsync(LoginRequestDto request, string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var user = await _userRepository.FindByEmailAsync(request.Email);
        if (user is null || user.IsDeleted)
        {
            _logger.LogWarning("Failed login — no matching active user");
            return null;
        }

        if (!PasswordHashHandler.VerifyPassword(request.Password, user.UserPassword))
        {
            _logger.LogWarning("Failed login — wrong password for UserId {UserId}", user.Id);
            return null;
        }

        var result = await IssueTokensAsync(user, ipAddress);
        _logger.LogInformation("Successful login for UserId {UserId}", user.Id);
        return result;
    }

    public async Task<AuthResult?> RefreshAsync(string rawRefreshToken, string? ipAddress = null)
    {
        var hash = _tokenService.HashRefreshToken(rawRefreshToken);
        var stored = await _refreshTokenRepository.FindByHashAsync(hash);

        if (stored is null)
        {
            _logger.LogWarning("Refresh presented with unknown hash");
            return null;
        }

        // Re-use attack: token was already rotated — revoke everything for this user
        if (stored.RevokedUtc is not null)
        {
            _logger.LogWarning("Refresh re-use detected for UserId {UserId} — revoking all tokens", stored.UserId);
            await _refreshTokenRepository.RevokeAllForUserAsync(stored.UserId);
            return null;
        }

        if (stored.ExpiresUtc < DateTime.UtcNow)
            return null;

        var user = await _userRepository.GetUserByIdAsync(stored.UserId);
        if (user is null || user.IsDeleted)
            return null;

        var newTokenId = Guid.NewGuid();
        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawNew = _tokenService.GenerateRefreshTokenRaw();

        // Revoke old token, pointing to its replacement
        await _refreshTokenRepository.RevokeAsync(stored.Id, newTokenId);

        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            Id = newTokenId,
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(rawNew),
            ExpiresUtc = DateTime.UtcNow.AddDays(_lifetimes.RefreshTokenValidityDays),
            CreatedUtc = DateTime.UtcNow,
            CreatedByIp = ipAddress,
        });

        return new AuthResult(user, accessToken, rawNew);
    }

    public async Task LogoutAsync(Guid callerId, string? rawRefreshToken)
    {
        if (!string.IsNullOrEmpty(rawRefreshToken))
        {
            var hash = _tokenService.HashRefreshToken(rawRefreshToken);
            var stored = await _refreshTokenRepository.FindByHashAsync(hash);
            if (stored is not null && stored.RevokedUtc is null)
                await _refreshTokenRepository.RevokeAsync(stored.Id);
        }
        _logger.LogInformation("Logout for UserId {UserId}", callerId);
    }

    private async Task<AuthResult> IssueTokensAsync(User user, string? ipAddress)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshTokenRaw();

        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
            ExpiresUtc = DateTime.UtcNow.AddDays(_lifetimes.RefreshTokenValidityDays),
            CreatedUtc = DateTime.UtcNow,
            CreatedByIp = ipAddress,
        });

        return new AuthResult(user, accessToken, rawRefreshToken);
    }
}
