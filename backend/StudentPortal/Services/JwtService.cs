using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StudentPortal.Handlers;
using StudentPortal.Models.Api;
using StudentPortal.Models.Entities;
using System;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

namespace StudentPortal.Services
{
    public class JwtService
    {
        private readonly StudentPortalApiContext _dbContext;
        private readonly IConfiguration _configuration;

        public JwtService(StudentPortalApiContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _configuration = configuration;
        }

        public async Task<LoginResponseModel> Authenticate(LoginRequestModel request)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) || string.IsNullOrWhiteSpace(request.Password))
                return null;

            var userAccount = await _dbContext.Users.FirstOrDefaultAsync(x => x.FirstName == request.FirstName && x.LastName == request.LastName);
            if (userAccount is null || !PasswordHashHandler.VerifyPassword(request.Password, userAccount.UserPassword))
                return null;

            //preparing data for token
            var issuer = _configuration["JwtConfig:Issuer"];
            var audience = _configuration["JwtConfig:Audience"];
            var key = _configuration["JwtConfig:Key"];
            var tokenValidityMins = _configuration.GetValue<int>("JwtConfig:TokenValidityMins");
            var tokenExpiryTimeStamp = DateTime.UtcNow.AddMinutes(tokenValidityMins);

            //creating token description
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, userAccount.Email), // Koristi email kao Sub claim
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Dodaj jedinstveni ID tokena
                    new Claim(ClaimTypes.Role, userAccount.UserRole.ToString()), // Dodaj ulogu korisnika
                }),
                Expires = tokenExpiryTimeStamp,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.ASCII.GetBytes(key)), SecurityAlgorithms.HmacSha512Signature),
            };

            //creating a token
            var tokenHandler = new JwtSecurityTokenHandler();
            var securityToken = tokenHandler.CreateToken(tokenDescriptor);
            var accessToken = tokenHandler.WriteToken(securityToken);

            return new LoginResponseModel
            {
                AccessToken = accessToken,
                UserFirstName = request.FirstName,
                UserLastName = request.LastName,
                ExpiresIn = (int)tokenExpiryTimeStamp.Subtract(DateTime.UtcNow).TotalSeconds
            };

        }
    }
}