using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeRepository
{
    Task<IEnumerable<Grade>> GetAllGradesAsync();
    Task<Grade> GetGradeByIdAsync(int id);
    Task<Grade> AddGradeAsync(Grade grade);
    Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(int studentId);
    Task UpdateGradeAsync(Grade grade);
    Task<bool> DeleteGradeAsync(int id);
    Task<Grade> ConfirmGradeAsync(int id);
    Task<IEnumerable<Grade>> GetGradesByStudentAndSubjectAsync(int studentId, int subjectId);
}