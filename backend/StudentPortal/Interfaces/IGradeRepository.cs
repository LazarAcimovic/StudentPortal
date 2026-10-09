using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeRepository
{
    Task<IEnumerable<Grade>> GetAllGradesAsync();
    Task<Grade> GetGradeByIdAsync(Guid id);
    Task<Grade> AddGradeAsync(Grade grade);
    Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(Guid studentId);
    Task UpdateGradeAsync(Grade grade);
    Task<bool> DeleteGradeAsync(Guid id);
    Task<Grade> ConfirmGradeAsync(Guid id);
    Task<IEnumerable<Grade>> GetGradesByStudentAndSubjectAsync(Guid studentId, Guid subjectId);
}