using StudentPortal.Dtos;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Services
{
    public class JwtService : IJwtService
    {
        private readonly IUserRepository _userRepository;
        private readonly ITokenService _tokenService;

        public JwtService(IUserRepository userRepository, ITokenService tokenService)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
        }

        public async Task<LoginResponseDto> Authenticate(LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return null;

            var userAccount = await _userRepository.FindByEmailAsync(request.Email);
            if (userAccount is null || userAccount.IsDeleted)
                return null;

            bool isPasswordValid = PasswordHashHandler.VerifyPassword(request.Password, userAccount.UserPassword);
            if (!isPasswordValid)
                return null;

            var accessToken = _tokenService.GenerateAccessToken(userAccount);

            return new LoginResponseDto
            {
                IndexNumber = userAccount.IndexNumber,
                Id = userAccount.Id,
                AccessToken = accessToken,
                Email = userAccount.Email,
                UserRole = userAccount.UserRole,
                FirstName = userAccount.FirstName,
                LastName = userAccount.LastName,
            };
        }
    }
}
