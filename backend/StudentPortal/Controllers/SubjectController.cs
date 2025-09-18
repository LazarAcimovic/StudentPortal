using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
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

                // GET: api/subject/professor/{professorId}
        [HttpGet("professor/{professorId}")]
        public async Task<ActionResult<IEnumerable<SubjectDto>>> GetSubjectsByProfessorId(int professorId)
        {
            try
            {
                var subjects = await _subjectService.GetSubjectsByProfessorIdAsync(professorId);
                if (subjects == null || !subjects.Any())
                {
                    return NotFound("No subjects found for this professor.");
                }
                return Ok(subjects);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        
        // GET: api/subject/{subjectId}/students
        [HttpGet("{subjectId}/students")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetStudentsBySubjectId(int subjectId)
        {
            try
            {
                var students = await _subjectService.GetStudentsBySubjectIdAsync(subjectId);
                if (students == null || !students.Any())
                {
                    return NotFound("No students enrolled in this subject.");
                }
                return Ok(students);
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
            var updatedSubject = await _subjectService.UpdateSubjectAsync(id, subjectDto);

            if (updatedSubject == null)
            {
                return NotFound($"Subject with ID {id} not found or update failed.");
            }

            // Nema potrebe za _mapper.Map(), jer servis već vraća ažurirani entitet
            return Ok(updatedSubject);
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