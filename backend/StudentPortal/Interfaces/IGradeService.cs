using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IGradeService
{
    Task<GradeDto?> GetByEnrollmentAsync(Guid enrollmentId, Guid callerProfId);
    Task<GradeDto> ConfirmGradeAsync(Guid enrollmentId, Guid callerProfId, decimal midterm1Points, decimal midterm2Points, decimal attendancePoints, decimal practicalPoints, decimal examPoints);
    Task<GradeDto> ReconfirmExamAsync(Guid enrollmentId, Guid callerProfId, decimal examPoints);
    Task<GradeDto> StudentConfirmAsync(Guid enrollmentId, Guid callerStudentId);
}
