using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Enums;

namespace StudentPortal.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        // GET: api/user/search?role=&query=&page=&pageSize=
        [Authorize(Roles = "Admin")]
        [HttpGet("search")]
        public async Task<ActionResult<PagedResultDto<UserSearchResultDto>>> SearchUsers(
            [FromQuery] RoleEnum role,
            [FromQuery] string? query,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 15)
        {
            var (p, ps) = PagingHelper.NormalizeSearch(page, pageSize);
            var result = await _userService.SearchAsync(role, query, p, ps);
            return Ok(result);
        }

        // GET: api/user
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<PagedResultDto<AdminUserDto>>> GetAllUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 15)
        {
            var (p, ps) = PagingHelper.Normalize(page, pageSize);
            var result = await _userService.GetPagedAsync(p, ps);
            return Ok(result);
        }

        // GET: api/user/{id}
        [Authorize(Roles = "Admin")]
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUserById(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found.");
            }
            return Ok(user);
        }

        // POST: api/user
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<UserDto>> AddUser([FromBody] AdminCreateUserDto userDto)
        {
            var newUser = await _userService.AddUserAsync(userDto);
            if (newUser == null)
            {
                return BadRequest("User could not be created.");
            }

            return CreatedAtAction(nameof(GetUserById), new { id = newUser.Id }, newUser);
        }

        // PUT: api/user/{id}
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<ActionResult<UserDto>> UpdateUser(Guid id, [FromBody] AdminUpdateUserDto userDto)
        {
            var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(callerIdStr, out var callerId))
                return Unauthorized();

            var updatedUser = await _userService.AdminUpdateUserAsync(id, callerId, userDto);
            if (updatedUser == null)
                return NotFound($"User with ID {id} not found.");

            return Ok(updatedUser);
        }

        // DELETE: api/user/{id}
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var success = await _userService.DeleteUserAsync(id);
            if (!success)
            {
                return NotFound($"User with ID {id} not found or deletion failed.");
            }
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("{studentId}/subjects-and-grades")]
        public async Task<ActionResult<IEnumerable<StudentSubjectGradesDto>>> GetStudentSubjectsAndGrades(Guid studentId)
        {
            var studentData = await _userService.GetStudentSubjectsAndGradesAsync(studentId);

            if (studentData == null || !studentData.Any())
            {
                return NotFound("Student nije upisan na nijedan predmet ili nema ocena.");
            }

            return Ok(studentData);
        }
    }
}