using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Student")]
public class StudentController : ControllerBase
{
    private readonly IStudentDashboardService _dashboardService;

    public StudentController(IStudentDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("me/dashboard")]
    public async Task<ActionResult<StudentDashboardDto>> GetDashboard()
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var dashboard = await _dashboardService.GetDashboardAsync(callerId);
            return Ok(dashboard);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
