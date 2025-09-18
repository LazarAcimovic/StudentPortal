using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers
{
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

        // GET: api/grade
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GradeDto>>> GetAllGrades()
        {
            try
            {
                var grades = await _gradeService.GetAllGradesAsync();
                if (grades == null || !grades.Any())
                {
                    return NotFound("No grades available.");
                }
                return Ok(grades);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/grade/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<GradeDto>> GetGradeById(int id)
        {
            try
            {
                var grade = await _gradeService.GetGradeByIdAsync(id);
                if (grade == null)
                {
                    return NotFound($"Grade with ID {id} not found.");
                }
                return Ok(grade);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // POST: api/grade
        [HttpPost]
        public async Task<ActionResult<GradeDto>> AddGrade([FromBody] GradeCreateDto gradeDto)
        {
            try
            {
                var newGrade = await _gradeService.AddGradeAsync(gradeDto);
                if (newGrade == null)
                {
                    // This can be due to a non-existent EnrollmentId or a validation issue
                    return BadRequest("Grade could not be created. Please check provided data.");
                }
                return CreatedAtAction(nameof(GetGradeById), new { id = newGrade.Id }, newGrade);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/grade/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateGrade(int id, [FromBody] GradeUpdateDto gradeDto)
        {
            try
            {
                var success = await _gradeService.UpdateGradeAsync(id, gradeDto);
                if (success == null)
                {
                    return NotFound($"Grade with ID {id} not found or update failed.");
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/grade/student/{studentId}/subject/{subjectId}
        [HttpGet("student/{studentId}/subject/{subjectId}")]
        public async Task<ActionResult<IEnumerable<GradeDto>>> GetGradesByStudentAndSubject(int studentId, int subjectId)
        {
            try
            {
                var grades = await _gradeService.GetGradesByStudentAndSubjectAsync(studentId, subjectId);
                if (grades == null || !grades.Any())
                {
                    return NotFound("Nema ocena za ovog studenta na ovom predmetu.");
                }
                return Ok(grades);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/grade/{id}/confirm
        [HttpPut("{id}/confirm")]
        public async Task<ActionResult<GradeDto>> ConfirmGrade(int id)
        {
            try
            {
                var confirmedGrade = await _gradeService.ConfirmGradeAsync(id);
                if (confirmedGrade == null)
                {
                    return NotFound($"Ocena sa ID-om {id} nije pronađena ili ne može biti potvrđena.");
                }
                return Ok(confirmedGrade);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Ažuriran DELETE: api/grade/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGrade(int id)
        {
            try
            {
                var success = await _gradeService.DeleteGradeAsync(id);
                if (!success)
                {
                    return BadRequest("Ocena sa ID-om nije pronađena ili je već potvrđena.");
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}