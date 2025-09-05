using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeRepository
{
    Task<IEnumerable<Grade>> GetAllGradesAsync();
    Task<Grade> GetGradeByIdAsync(int id);
    Task<Grade> AddGradeAsync(Grade grade);
    Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(int studentId);
    Task UpdateGradeAsync(Grade grade);
    Task DeleteGradeAsync(int id);
}