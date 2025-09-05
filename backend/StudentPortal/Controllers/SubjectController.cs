using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectController : ControllerBase
    {
        private readonly ISubjectService _subjectService;

        public SubjectController(ISubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        // GET: api/subject
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SubjectDto>>> GetAllSubjects()
        {
            try
            {
                var subjects = await _subjectService.GetAllSubjectsAsync();
                if (subjects == null || !subjects.Any())
                {
                    return NotFound("No subjects available.");
                }
                return Ok(subjects);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/subject/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SubjectDto>> GetSubjectById(int id)
        {
            try
            {
                var subject = await _subjectService.GetSubjectByIdAsync(id);
                if (subject == null)
                {
                    return NotFound($"Subject with ID {id} not found.");
                }
                return Ok(subject);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // POST: api/subject
        [HttpPost]
        public async Task<ActionResult<SubjectDto>> AddSubject([FromBody] SubjectCreateDto subjectDto)
        {
            try
            {
                var newSubject = await _subjectService.AddSubjectAsync(subjectDto);
                if (newSubject == null)
                {
                    // This can be due to a non-existent ProfessorId or a validation issue
                    return BadRequest("Subject could not be created. Please check provided data.");
                }
                return CreatedAtAction(nameof(GetSubjectById), new { id = newSubject.Id }, newSubject);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/subject/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] SubjectUpdateDto subjectDto)
        {
            try
            {
                var success = await _subjectService.UpdateSubjectAsync(id, subjectDto);
                if (!success)
                {
                    return NotFound($"Subject with ID {id} not found or update failed.");
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // DELETE: api/subject/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            try
            {
                var success = await _subjectService.DeleteSubjectAsync(id);
                if (!success)
                {
                    return NotFound($"Subject with ID {id} not found or deletion failed.");
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