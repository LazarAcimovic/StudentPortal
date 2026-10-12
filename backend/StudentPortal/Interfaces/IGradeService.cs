using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IGradeService
{
    Task<GradeDto?> GetByEnrollmentAsync(Guid enrollmentId, Guid callerProfId);
    Task<GradeDto> ConfirmGradeAsync(Guid enrollmentId, Guid callerProfId);
    Task<GradeDto> ReconfirmExamAsync(Guid enrollmentId, Guid callerProfId, decimal examPoints);
}
