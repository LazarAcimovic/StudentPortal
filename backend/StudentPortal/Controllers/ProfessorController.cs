using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Professor")]
public class ProfessorController : ControllerBase
{
    private readonly IProfessorDashboardService _dashboardService;

    public ProfessorController(IProfessorDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("me/dashboard")]
    public async Task<ActionResult<ProfessorDashboardDto>> GetDashboard()
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        var dashboard = await _dashboardService.GetDashboardAsync(callerId);
        return Ok(dashboard);
    }
}
