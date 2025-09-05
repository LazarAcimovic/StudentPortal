using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;
/*
namespace StudentPortal.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EnrollmentController : ControllerBase
    {
        private readonly IEnrollmentService _enrollmentService;

        public EnrollmentController(IEnrollmentService enrollmentService)
        {
            _enrollmentService = enrollmentService;
        }

        // GET: api/enrollment
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EnrollmentDto>>> GetAllEnrollments()
        {
            try
            {
                var enrollments = await _enrollmentService.GetAllEnrollmentsAsync();
                if (enrollments == null || !enrollments.Any())
                {
                    return NotFound("No enrollments available.");
                }
                return Ok(enrollments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/enrollment/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<EnrollmentDto>> GetEnrollmentById(int id)
        {
            try
            {
                var enrollment = await _enrollmentService.GetEnrollmentByIdAsync(id);
                if (enrollment == null)
                {
                    return NotFound($"Enrollment with ID {id} not found.");
                }
                return Ok(enrollment);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // POST: api/enrollment
        [HttpPost]
        public async Task<ActionResult<EnrollmentDto>> AddEnrollment([FromBody] EnrollmentCreateDto enrollmentDto)
        {
            try
            {
                var newEnrollment = await _enrollmentService.AddEnrollmentAsync(enrollmentDto);
                if (newEnrollment == null)
                {
                    return BadRequest("Enrollment could not be created. Student or subject might not exist or enrollment already exists.");
                }
                return CreatedAtAction(nameof(GetEnrollmentById), new { id = newEnrollment.Id }, newEnrollment);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/enrollment/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEnrollment(int id, [FromBody] EnrollmentUpdateDto enrollmentDto)
        {
            try
            {
                var success = await _enrollmentService.UpdateEnrollmentAsync(id, enrollmentDto);
                if (!success)
                {
                    return NotFound($"Enrollment with ID {id} not found or update failed.");
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // DELETE: api/enrollment/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEnrollment(int id)
        {
            try
            {
                var success = await _enrollmentService.DeleteEnrollmentAsync(id);
                if (!success)
                {
                    return NotFound($"Enrollment with ID {id} not found or deletion failed.");
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

*/