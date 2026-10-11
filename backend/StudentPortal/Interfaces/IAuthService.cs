using StudentPortal.Dtos;
using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public record AuthResult(User User, string AccessToken, string RawRefreshToken);

public interface IAuthService
{
    Task<AuthResult?> AuthenticateAsync(LoginRequestDto request, string? ipAddress = null);
}
