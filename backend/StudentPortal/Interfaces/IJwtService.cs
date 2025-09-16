using StudentPortal.Dtos;

namespace StudentPortal.Interfaces
{
    public interface IJwtService
    {
        Task<LoginResponseDto> Authenticate(LoginRequestDto request);
    }
}
