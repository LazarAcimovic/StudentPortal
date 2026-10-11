using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeDraftRepository
{
    Task<GradeDraft?> GetByEnrollmentIdAsync(Guid enrollmentId);
    Task<GradeDraft> AddAsync(GradeDraft draft);
    Task UpdateAsync(GradeDraft draft);
    Task DeleteAsync(GradeDraft draft);
}
