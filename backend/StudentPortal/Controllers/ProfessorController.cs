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
    private readonly IProfessorStudentsService _studentsService;

    public ProfessorController(
        IProfessorDashboardService dashboardService,
        IProfessorStudentsService studentsService)
    {
        _dashboardService = dashboardService;
        _studentsService = studentsService;
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

    [HttpGet("subjects/{subjectId}/students")]
    public async Task<ActionResult<PagedResultDto<ProfessorStudentRowDto>>> GetSubjectStudents(
        Guid subjectId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 5)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        if (page < 1) page = 1;
        if (pageSize != 5 && pageSize != 20 && pageSize != 50) pageSize = 5;

        try
        {
            var result = await _studentsService.GetPagedStudentsAsync(subjectId, callerId, page, pageSize);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
