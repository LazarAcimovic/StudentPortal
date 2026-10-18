using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GradeController : ControllerBase
{
    private readonly IGradeService _gradeService;

    public GradeController(IGradeService gradeService)
    {
        _gradeService = gradeService;
    }

    [HttpGet("by-enrollment/{enrollmentId:guid}")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<GradeDto>> GetByEnrollment(Guid enrollmentId)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var grade = await _gradeService.GetByEnrollmentAsync(enrollmentId, callerId);
            if (grade == null)
                return NotFound();
            return Ok(grade);
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

    [HttpPost("confirm")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<GradeDto>> Confirm([FromBody] ConfirmGradeDto dto)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var grade = await _gradeService.ConfirmGradeAsync(
                dto.EnrollmentId, callerId,
                dto.Midterm1Points, dto.Midterm2Points,
                dto.AttendancePoints, dto.PracticalPoints, dto.ExamPoints);

            return Ok(grade);
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

    [HttpPost("reconfirm-exam")]
    [Authorize(Roles = "Professor")]
    public async Task<ActionResult<GradeDto>> ReconfirmExam([FromBody] ReconfirmExamDto dto)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var grade = await _gradeService.ReconfirmExamAsync(dto.EnrollmentId, callerId, dto.ExamPoints);
            return Ok(grade);
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

    [HttpPost("student-confirm")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<GradeDto>> StudentConfirm([FromBody] StudentConfirmGradeDto dto)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        try
        {
            var grade = await _gradeService.StudentConfirmAsync(dto.EnrollmentId, callerId);
            return Ok(grade);
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
