using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IGradeDraftService
{
    Task<GradeDraftDto?> GetDraftAsync(Guid enrollmentId, Guid callerProfId);
    Task<GradeDraftDto> SaveDraftAsync(Guid enrollmentId, Guid callerProfId, decimal? midterm1Points, decimal? midterm2Points, decimal? attendancePoints, decimal? practicalPoints, decimal? examPoints);
}
