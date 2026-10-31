using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeRepository
{
    Task<IEnumerable<Grade>> GetAllGradesAsync();
    Task<Grade> GetGradeByIdAsync(Guid id);
    Task<Grade?> GetByEnrollmentIdAsync(Guid enrollmentId);
    Task<Grade> AddGradeAsync(Grade grade);
    Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(Guid studentId);
    Task UpdateGradeAsync(Grade grade);
    Task<bool> DeleteGradeAsync(Guid id);
    Task<Grade> ConfirmGradeAsync(Guid id);
    Task<IEnumerable<Grade>> GetGradesByStudentAndSubjectAsync(Guid studentId, Guid subjectId);
    Task<IEnumerable<Grade>> GetAllWithEscalationDetailsAsync(DateTime now);
    Task<(IReadOnlyList<Grade> Items, int TotalCount)> GetPagedWithEscalationDetailsAsync(DateTime now, int page, int pageSize);
    Task<Grade?> GetByIdWithEscalationDetailsAsync(Guid id);
    Task<IEnumerable<Grade>> GetAssignedCasesAsync(Guid professorId);
}