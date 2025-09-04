using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IEnrollmentService
{
    Task<IEnumerable<EnrollmentDto>> GetAllEnrollmentsAsync();
    Task<IEnumerable<EnrollmentDto>> GetEnrollmentsByStudentIdAsync(int studentId);
    Task<EnrollmentDto> AddEnrollmentAsync(EnrollmentCreateDto enrollmentDto);
    Task<bool> DeleteEnrollmentAsync(int enrollmentId);
}