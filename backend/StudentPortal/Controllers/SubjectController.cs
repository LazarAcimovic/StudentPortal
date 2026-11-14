using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.Handlers;
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

        // GET: api/subject/search?query=&page=&pageSize=
        [Authorize(Roles = "Admin")]
        [HttpGet("search")]
        public async Task<ActionResult<PagedResultDto<SubjectSearchResultDto>>> SearchSubjects(
            [FromQuery] string? query,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 15)
        {
            var (p, ps) = PagingHelper.NormalizeSearch(page, pageSize);
            var result = await _subjectService.SearchAsync(query, p, ps);
            return Ok(result);
        }

        // GET: api/subject
        [HttpGet]
        public async Task<ActionResult<PagedResultDto<SubjectDto>>> GetAllSubjects(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 15)
        {
            var (p, ps) = PagingHelper.Normalize(page, pageSize);
            var result = await _subjectService.GetPagedAsync(p, ps);
            return Ok(result);
        }

        // GET: api/subject/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SubjectDto>> GetSubjectById(Guid id)
        {
            var subject = await _subjectService.GetSubjectByIdAsync(id);
            if (subject == null)
            {
                return NotFound($"Subject with ID {id} not found.");
            }
            return Ok(subject);
        }


        // POST: api/subject
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<SubjectDto>> AddSubject([FromBody] SubjectCreateDto subjectDto)
        {
            try
            {
                var newSubject = await _subjectService.AddSubjectAsync(subjectDto);
                if (newSubject == null)
                    return BadRequest("Subject could not be created. Please check provided data.");
                return CreatedAtAction(nameof(GetSubjectById), new { id = newSubject.Id }, newSubject);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        // PUT: api/subject/{id}
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSubject(Guid id, [FromBody] SubjectUpdateDto subjectDto)
        {
            try
            {
                var updatedSubject = await _subjectService.UpdateSubjectAsync(id, subjectDto);

                if (updatedSubject == null)
                {
                    return NotFound($"Subject with ID {id} not found or update failed.");
                }

                return Ok(updatedSubject);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE: api/subject/{id}
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSubject(Guid id)
        {
            var success = await _subjectService.DeleteSubjectAsync(id);
            if (!success)
            {
                return NotFound($"Subject with ID {id} not found or deletion failed.");
            }
            return NoContent();
        }
    }
}