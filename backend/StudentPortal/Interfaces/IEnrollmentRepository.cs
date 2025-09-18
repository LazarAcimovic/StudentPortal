using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IEnrollmentRepository
{
    Task<IEnumerable<Enrollment>> GetAllEnrollmentsAsync();
    Task<Enrollment> GetEnrollmentByIdAsync(int id);
    Task<Enrollment> AddEnrollmentAsync(Enrollment enrollment);
    Task UpdateEnrollmentAsync(Enrollment enrollment);
    Task DeleteEnrollmentAsync(int id);

    Task<Enrollment> GetByIdAsync(int id);

    Task<Enrollment> GetEnrollmentByStudentAndSubjectIdAsync(int studentId, int subjectId);

    Task<IEnumerable<Enrollment>> GetStudentEnrollmentsWithDetailsAsync(int studentId);
}