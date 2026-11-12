using StudentPortal.Dtos;
using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface ISubjectRepository
{
    Task<Subject> GetSubjectByIdAsync(Guid id);
    Task<Subject> AddSubjectAsync(Subject subject);
    Task UpdateSubjectAsync(Subject subject);
    Task DeleteSubjectAsync(Guid id);

    Task<IEnumerable<Subject>> GetSubjectsByProfessorIdAsync(Guid professorId);
    Task<IEnumerable<UserSearchResultDto>> GetStudentsBySubjectIdAsync(Guid subjectId);
    Task<(IReadOnlyList<Subject> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);
    Task<(IReadOnlyList<Subject> Items, int TotalCount)> SearchAsync(string? query, int page, int pageSize);
}