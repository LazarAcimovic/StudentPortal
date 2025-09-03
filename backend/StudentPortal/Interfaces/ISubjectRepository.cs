using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface ISubjectRepository
{
    Task<IEnumerable<Subject>> GetAllSubjectAsync();
    Task<Subject> GetSubjectByIdAsync(int id);
    Task AddSubjectAsync(Subject subject);
    Task UpdateSubjectAsync(Subject subject);
    Task DeleteSubjectAsync(int id);
}