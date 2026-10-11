using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshTokenRaw();
    string HashRefreshToken(string rawToken);
}
