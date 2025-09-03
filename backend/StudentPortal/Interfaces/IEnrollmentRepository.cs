using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IEnrollmentRepository
{
    Task<IEnumerable<Enrollment>> GetAllEnrollmentAsync();
    Task<Enrollment> GetEnrollmentByIdAsync(int id);
    Task AddEnrollmentAsync(Enrollment enrollment);
    Task UpdateEnrollmentAsync(Enrollment enrollment);
    Task DeleteEnrollmentAsync(int id);
}