using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface ISubjectRepository
{
    Task<IEnumerable<Subject>> GetAllSubjectsAsync();
    Task<Subject> GetSubjectByIdAsync(Guid id);
    Task<Subject> AddSubjectAsync(Subject subject);
    Task UpdateSubjectAsync(Subject subject);
    Task DeleteSubjectAsync(Guid id);

    Task<IEnumerable<Subject>> GetSubjectsByProfessorIdAsync(Guid professorId);
    Task<IEnumerable<User>> GetStudentsBySubjectIdAsync(Guid subjectId);
}