using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeRepository
{
    Task<Grade> GetGradeByIdAsync(Guid id);
    Task<Grade?> GetByEnrollmentIdAsync(Guid enrollmentId);
    Task<Grade> AddGradeAsync(Grade grade);
    Task UpdateGradeAsync(Grade grade);
    Task<bool> DeleteGradeAsync(Guid id);
    Task<(IReadOnlyList<Grade> Items, int TotalCount)> GetPagedWithEscalationDetailsAsync(DateTime now, int page, int pageSize);
    Task<Grade?> GetByIdWithEscalationDetailsAsync(Guid id);
    Task<IEnumerable<Grade>> GetAssignedCasesAsync(Guid professorId);
}