using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Professor")]
public class GradeDraftController : ControllerBase
{
    private readonly IGradeDraftService _draftService;

    public GradeDraftController(IGradeDraftService draftService)
    {
        _draftService = draftService;
    }

    [HttpGet("{enrollmentId:guid}")]
    public async Task<ActionResult<GradeDraftDto>> GetDraft(Guid enrollmentId)
    {
        if (this.CallerId() is not { } callerId)
            return Unauthorized();

        try
        {
            var draft = await _draftService.GetDraftAsync(enrollmentId, callerId);
            if (draft == null)
                return NoContent();

            return Ok(draft);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ForbiddenAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpPut("{enrollmentId:guid}")]
    public async Task<ActionResult<GradeDraftDto>> SaveDraft(Guid enrollmentId, [FromBody] SaveGradeDraftDto dto)
    {
        if (this.CallerId() is not { } callerId)
            return Unauthorized();

        try
        {
            var draft = await _draftService.SaveDraftAsync(
                enrollmentId,
                callerId,
                dto.Midterm1Points,
                dto.Midterm2Points,
                dto.AttendancePoints,
                dto.PracticalPoints,
                dto.ExamPoints);

            return Ok(draft);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ForbiddenAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }
}
