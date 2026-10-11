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

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IRefreshTokenRepository refreshTokenRepository)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _refreshTokenRepository = refreshTokenRepository;
    }

    public async Task<AuthResult?> AuthenticateAsync(LoginRequestDto request, string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var user = await _userRepository.FindByEmailAsync(request.Email);
        if (user is null || user.IsDeleted)
            return null;

        if (!PasswordHashHandler.VerifyPassword(request.Password, user.UserPassword))
            return null;

        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshTokenRaw();

        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
            ExpiresUtc = DateTime.UtcNow.AddDays(7),
            CreatedUtc = DateTime.UtcNow,
            CreatedByIp = ipAddress,
        });

        return new AuthResult(user, accessToken, rawRefreshToken);
    }
}
