using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class EscalationController : ControllerBase
{
    private readonly IEscalationService _escalationService;
    private readonly TimeProvider _timeProvider;

    public EscalationController(IEscalationService escalationService, TimeProvider timeProvider)
    {
        _escalationService = escalationService;
        _timeProvider = timeProvider;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EscalatedCaseDto>>> GetAllCases()
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var cases = await _escalationService.GetAllCasesAsync(now);
        return Ok(cases);
    }

    [HttpGet("eligible-professors")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetEligibleProfessors(
        [FromQuery] Guid gradeId)
    {
        if (gradeId == Guid.Empty)
            return BadRequest("gradeId is required.");

        try
        {
            var professors = await _escalationService.GetEligibleProfessorsAsync(gradeId);
            return Ok(professors);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("assign")]
    public async Task<ActionResult<EscalatedCaseDto>> Assign([FromBody] AssignProfessorDto dto)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var adminId))
            return Unauthorized();

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        try
        {
            var result = await _escalationService.AssignProfessorAsync(dto.GradeId, dto.AssignedProfessorId, adminId, now);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // "already has an open escalation" or "professor not eligible"
            var message = ex.Message;
            if (message.Contains("eligible") || message.Contains("not eligible"))
                return UnprocessableEntity(message);
            return BadRequest(message);
        }
    }

    [HttpPost("reassign")]
    public async Task<ActionResult<EscalatedCaseDto>> Reassign([FromBody] ReassignProfessorDto dto)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var adminId))
            return Unauthorized();

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        try
        {
            var result = await _escalationService.ReassignProfessorAsync(dto.GradeId, dto.NewProfessorId, adminId, now);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            var message = ex.Message;
            if (message.Contains("eligible") || message.Contains("not eligible"))
                return UnprocessableEntity(message);
            return BadRequest(message);
        }
    }
}
