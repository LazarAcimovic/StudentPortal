using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;

namespace WebApiDemo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AccountController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IUserService _userService;

        public AccountController(IAuthService authService, IUserService userService)
        {
            _authService = authService;
            _userService = userService;
        }

        [AllowAnonymous]
        [HttpPost("Login")]
        public async Task<ActionResult<LoginResponseDto>> Login(LoginRequestDto request)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var result = await _authService.AuthenticateAsync(request, ipAddress);
            if (result is null)
                return Unauthorized("Invalid email or password.");

            return Ok(new LoginResponseDto
            {
                Id = result.User.Id,
                Email = result.User.Email,
                IndexNumber = result.User.IndexNumber,
                AccessToken = result.AccessToken,
                UserRole = result.User.UserRole,
                FirstName = result.User.FirstName,
                LastName = result.User.LastName,
            });
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

                // TODO Task 6: delete sp_access and sp_refresh cookies once cookie auth is in place
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
    }
}