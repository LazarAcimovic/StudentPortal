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
    Task<IEnumerable<Enrollment>> GetStudentEnrollmentsForDashboardAsync(Guid studentId);
    Task<IEnumerable<Enrollment>> GetEnrollmentsForProfessorDashboardAsync(Guid professorId);
    Task<(IReadOnlyList<Enrollment> Items, int TotalCount)> GetPagedStudentsForSubjectAsync(
        Guid subjectId, int page, int pageSize);
    Task<(IReadOnlyList<Enrollment> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);
}