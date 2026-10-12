using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AppealController : ControllerBase
{
    private readonly IAppealService _appealService;

    public AppealController(IAppealService appealService)
    {
        _appealService = appealService;
    }

    [HttpPost]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<AppealDto>> Submit([FromBody] SubmitAppealDto dto)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var appeal = await _appealService.SubmitAsync(callerId, dto);
            return Ok(appeal);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ForbiddenAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<IEnumerable<AppealDto>>> GetPending()
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        var appeals = await _appealService.GetPendingForProfessorAsync(callerId);
        return Ok(appeals);
    }

    [HttpGet("by-grade/{gradeId:guid}")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<IEnumerable<AppealDto>>> GetByGrade(Guid gradeId)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var appeals = await _appealService.GetByGradeAsync(gradeId, callerId);
            return Ok(appeals);
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

    [HttpPost("{id:guid}/accept")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<AppealDto>> Accept(Guid id)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var appeal = await _appealService.AcceptAsync(id, callerId);
            return Ok(appeal);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ForbiddenAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/deny")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<AppealDto>> Deny(Guid id)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var appeal = await _appealService.DenyAsync(id, callerId);
            return Ok(appeal);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ForbiddenAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/undo-deny")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<AppealDto>> UndoDeny(Guid id)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var appeal = await _appealService.UndoDenyAsync(id, callerId);
            return Ok(appeal);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ForbiddenAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
