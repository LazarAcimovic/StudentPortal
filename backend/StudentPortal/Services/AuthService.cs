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

        await EnforceRetentionAsync(user.Id);
        return new AuthResult(user, accessToken, rawNew);
    }

    public async Task LogoutAsync(string? rawRefreshToken)
    {
        // Authenticated by the refresh cookie alone (D-044): no caller id, so logout
        // works after the access token has expired. Revoke the matching live row and
        // return silently either way so the endpoint is not a token-existence oracle.
        if (string.IsNullOrEmpty(rawRefreshToken))
            return;

        var hash = _tokenService.HashRefreshToken(rawRefreshToken);
        var stored = await _refreshTokenRepository.FindByHashAsync(hash);
        if (stored is not null && stored.RevokedUtc is null)
        {
            await _refreshTokenRepository.RevokeAsync(stored.Id);
            _logger.LogInformation("Logout for UserId {UserId}", stored.UserId);
        }
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

        await EnforceRetentionAsync(user.Id);
        return new AuthResult(user, accessToken, rawRefreshToken);
    }

    /// <summary>
    /// Opportunistic refresh-row retention on the write path (D-041): prune the user's
    /// rows that are both revoked and expired beyond the retention window, then revoke the
    /// oldest live rows that exceed the per-user cap. Never touches a live, within-cap row.
    /// </summary>
    private async Task EnforceRetentionAsync(Guid userId)
    {
        var rows = await _refreshTokenRepository.GetAllForUserAsync(userId);
        if (rows is not { Count: > 0 })
            return;

        var now = DateTime.UtcNow;

        var pruneBefore = now.AddDays(-_lifetimes.RevokedTokenRetentionDays);
        var pruneIds = rows
            .Where(t => t.RevokedUtc is not null && t.ExpiresUtc < pruneBefore)
            .Select(t => t.Id)
            .ToList();
        if (pruneIds.Count > 0)
            await _refreshTokenRepository.DeleteRangeAsync(pruneIds);

        var live = rows
            .Where(t => t.RevokedUtc is null && t.ExpiresUtc >= now)
            .OrderBy(t => t.CreatedUtc)
            .ToList();
        var excess = live.Count - _lifetimes.MaxLiveTokensPerUser;
        for (var i = 0; i < excess; i++)
            await _refreshTokenRepository.RevokeAsync(live[i].Id);
    }
}
