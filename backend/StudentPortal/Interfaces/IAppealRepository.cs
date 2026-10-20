using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IAppealRepository
{
    Task<Appeal?> GetByIdAsync(Guid id);
    Task<IEnumerable<Appeal>> GetByGradeIdAsync(Guid gradeId);
    Task<IEnumerable<Appeal>> GetPendingByProfessorIdAsync(Guid professorId);
    Task<Appeal> AddAsync(Appeal appeal);
    Task UpdateAsync(Appeal appeal);
    Task<IEnumerable<Appeal>> GetAppealsByProfessorIdForDashboardAsync(Guid professorId, DateTime now);
}
