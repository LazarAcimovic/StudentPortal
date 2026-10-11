using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IAppealRepository
{
    Task<Appeal?> GetByIdAsync(Guid id);
    Task<IEnumerable<Appeal>> GetByGradeIdAsync(Guid gradeId);
    Task<Appeal> AddAsync(Appeal appeal);
    Task UpdateAsync(Appeal appeal);
}
