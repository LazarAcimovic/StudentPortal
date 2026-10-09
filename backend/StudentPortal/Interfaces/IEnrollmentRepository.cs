using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IEnrollmentRepository
{
    Task<IEnumerable<Enrollment>> GetAllEnrollmentsAsync();
    Task<Enrollment> GetEnrollmentByIdAsync(Guid id);
    Task<Enrollment> AddEnrollmentAsync(Enrollment enrollment);
    Task UpdateEnrollmentAsync(Enrollment enrollment);
    Task DeleteEnrollmentAsync(Guid id);

    Task<Enrollment> GetByIdAsync(Guid id);

    Task<Enrollment> GetEnrollmentByStudentAndSubjectIdAsync(Guid studentId, Guid subjectId);

    Task<IEnumerable<Enrollment>> GetStudentEnrollmentsWithDetailsAsync(Guid studentId);
}