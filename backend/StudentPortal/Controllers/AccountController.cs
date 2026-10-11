using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AccountController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IUserService _userService;
        private readonly IWebHostEnvironment _env;

        public AccountController(IAuthService authService, IUserService userService, IWebHostEnvironment env)
        {
            _authService = authService;
            _userService = userService;
            _env = env;
        }

        [AllowAnonymous]
        [HttpPost("Login")]
        public async Task<ActionResult<LoginResponseDto>> Login(LoginRequestDto request)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var result = await _authService.AuthenticateAsync(request, ip);
            if (result is null)
                return Unauthorized("Invalid email or password.");

            SetAuthCookies(result.AccessToken, result.RawRefreshToken);

            return Ok(new LoginResponseDto
            {
                Id = result.User.Id,
                Email = result.User.Email,
                IndexNumber = result.User.IndexNumber,
                UserRole = result.User.UserRole,
                FirstName = result.User.FirstName,
                LastName = result.User.LastName,
            });
        }

        [AllowAnonymous]
        [HttpPost("Refresh")]
        public async Task<IActionResult> Refresh()
        {
            var rawRefreshToken = Request.Cookies["sp_refresh"];
            if (string.IsNullOrEmpty(rawRefreshToken))
                return Unauthorized();

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var result = await _authService.RefreshAsync(rawRefreshToken, ip);
            if (result is null)
            {
                ClearAuthCookies();
                return Unauthorized();
            }

            SetAuthCookies(result.AccessToken, result.RawRefreshToken);
            return NoContent();
        }

        [HttpPost("Logout")]
        public async Task<IActionResult> Logout()
        {
            var rawRefreshToken = Request.Cookies["sp_refresh"];
            if (!string.IsNullOrEmpty(rawRefreshToken))
            {
                var hash = HttpContext.RequestServices
                    .GetRequiredService<ITokenService>()
                    .HashRefreshToken(rawRefreshToken);

                var refreshTokenRepo = HttpContext.RequestServices
                    .GetRequiredService<IRefreshTokenRepository>();

                var stored = await refreshTokenRepo.FindByHashAsync(hash);
                if (stored is not null && stored.RevokedUtc is null)
                    await refreshTokenRepo.RevokeAsync(stored.Id);
            }

            ClearAuthCookies();
            return NoContent();
        }

        [HttpGet("Me")]
        public async Task<ActionResult<UserDto>> Me()
        {
            var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(callerIdStr, out var callerId))
                return Unauthorized();

            var user = await _userService.GetUserByIdAsync(callerId);
            if (user is null)
                return NotFound();

            return Ok(user);
        }

        [HttpPut("profile")]
        public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(callerIdStr, out var callerId))
                return Unauthorized();

            try
            {
                var updated = await _userService.UpdateProfileAsync(callerId, dto);
                if (updated == null)
                    return NotFound();

                return Ok(updated);
            }
            catch (ForbiddenAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(callerIdStr, out var callerId))
                return Unauthorized();

            try
            {
                await _userService.ChangePasswordAsync(callerId, dto);
                ClearAuthCookies();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { field = "currentPassword", message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private CookieOptions CreateCookieOptions(DateTimeOffset expires) => new()
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = expires,
        };

        private void SetAuthCookies(string accessToken, string rawRefreshToken)
        {
            Response.Cookies.Append("sp_access", accessToken,
                CreateCookieOptions(DateTimeOffset.UtcNow.AddMinutes(15)));
            Response.Cookies.Append("sp_refresh", rawRefreshToken,
                CreateCookieOptions(DateTimeOffset.UtcNow.AddDays(7)));
        }

        private void ClearAuthCookies()
        {
            var options = new CookieOptions { Path = "/" };
            Response.Cookies.Delete("sp_access", options);
            Response.Cookies.Delete("sp_refresh", options);
        }
    }
}
