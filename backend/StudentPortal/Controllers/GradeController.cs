using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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

        // DELETE: api/grade/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGrade(int id)
        {
            try
            {
                var success = await _gradeService.DeleteGradeAsync(id);
                if (!success)
                {
                    return NotFound($"Grade with ID {id} not found or deletion failed.");
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