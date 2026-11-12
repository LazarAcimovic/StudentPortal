using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IEnrollmentService
{
    Task<EnrollmentDto> GetEnrollmentByIdAsync(Guid studentId);
    Task<EnrollmentDto> AddEnrollmentAsync(EnrollmentCreateDto enrollmentDto);
    Task<PagedResultDto<EnrollmentDto>> GetPagedAsync(int page, int pageSize);
}