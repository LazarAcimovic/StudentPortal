using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Handlers;
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
        if (this.CallerId() is not { } callerId)
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
