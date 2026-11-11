using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using StudentPortal.Configuration;
using StudentPortal.Dtos;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AccountController : ControllerBase
    {
        // Reject an oversized auth payload before model binding. A login or
        // change-password body is a few hundred bytes; 8 KB is generous headroom and
        // removes the "hand the server a 1 MB password" PBKDF2-amplification surface
        // on top of the per-field MaximumLength(128) bound (Tech-Backend §5, R03.5).
        private const long AuthBodyByteLimit = 8 * 1024;

        private readonly IAuthService _authService;
        private readonly IUserService _userService;
        private readonly IWebHostEnvironment _env;
        private readonly TokenLifetimeOptions _lifetimes;

        public AccountController(
            IAuthService authService,
            IUserService userService,
            IWebHostEnvironment env,
            IOptions<TokenLifetimeOptions> lifetimes)
        {
            _authService = authService;
            _userService = userService;
            _env = env;
            _lifetimes = lifetimes.Value;
        }

        [AllowAnonymous]
        [HttpPost("Login")]
        [RequestSizeLimit(AuthBodyByteLimit)]
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

        // [AllowAnonymous] so logout still works once the 15-minute access token has
        // expired — it is authenticated by the sp_refresh cookie alone (D-044).
        [AllowAnonymous]
        [HttpPost("Logout")]
        public async Task<IActionResult> Logout()
        {
            var rawRefreshToken = Request.Cookies["sp_refresh"];
            await _authService.LogoutAsync(rawRefreshToken);

            ClearAuthCookies();
            return NoContent();
        }

        [HttpGet("Me")]
        public async Task<ActionResult<UserDto>> Me()
        {
            if (this.CallerId() is not { } callerId)
                return Unauthorized();

            var user = await _userService.GetUserByIdAsync(callerId);
            if (user is null)
                return NotFound();

            return Ok(user);
        }

        [HttpPut("profile")]
        public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            if (this.CallerId() is not { } callerId)
                return Unauthorized();

            var updated = await _userService.UpdateProfileAsync(callerId, dto);
            if (updated == null)
                return NotFound();

            return Ok(updated);
        }

        [HttpPost("change-password")]
        [RequestSizeLimit(AuthBodyByteLimit)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (this.CallerId() is not { } callerId)
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
        }

        private CookieOptions CreateCookieOptions(DateTimeOffset? expires = null, string path = "/") => new()
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = path,
            Expires = expires,
        };

        private void SetAuthCookies(string accessToken, string rawRefreshToken)
        {
            Response.Cookies.Append("sp_access", accessToken,
                CreateCookieOptions(DateTimeOffset.UtcNow.AddMinutes(_lifetimes.TokenValidityMins)));
            Response.Cookies.Append("sp_refresh", rawRefreshToken,
                CreateCookieOptions(DateTimeOffset.UtcNow.AddDays(_lifetimes.RefreshTokenValidityDays), "/api/Account"));
        }

        private void ClearAuthCookies()
        {
            Response.Cookies.Delete("sp_access", CreateCookieOptions(path: "/"));
            Response.Cookies.Delete("sp_refresh", CreateCookieOptions(path: "/api/Account"));
        }
    }
}
