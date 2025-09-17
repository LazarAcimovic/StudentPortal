using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface ISubjectRepository
{
    Task<IEnumerable<Subject>> GetAllSubjectsAsync();
    Task<Subject> GetSubjectByIdAsync(int id);
    Task<Subject> AddSubjectAsync(Subject subject);
    Task UpdateSubjectAsync(Subject subject);
    Task DeleteSubjectAsync(int id);

    Task<IEnumerable<Subject>> GetSubjectsByProfessorIdAsync(int professorId);
    Task<IEnumerable<User>> GetStudentsBySubjectIdAsync(int subjectId);
}