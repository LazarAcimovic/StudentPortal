using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeRepository
{
    Task<IEnumerable<Grade>> GetAllGradeAsync();
    Task<Grade> GetGradeByIdAsync(int id);
    Task AddGradeAsync(Grade grade);
    Task UpdateGradeAsync(Grade grade);
    Task DeleteGradeAsync(int id);
}