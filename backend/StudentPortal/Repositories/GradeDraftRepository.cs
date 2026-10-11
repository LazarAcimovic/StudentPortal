using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class GradeDraftRepository : IGradeDraftRepository
{
    private readonly StudentPortalApiContext _context;

    public GradeDraftRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<GradeDraft?> GetByEnrollmentIdAsync(Guid enrollmentId)
    {
        return await _context.GradeDrafts
            .FirstOrDefaultAsync(d => d.EnrollmentId == enrollmentId);
    }

    public async Task<GradeDraft> AddAsync(GradeDraft draft)
    {
        await _context.GradeDrafts.AddAsync(draft);
        await _context.SaveChangesAsync();
        return draft;
    }

    public async Task UpdateAsync(GradeDraft draft)
    {
        _context.GradeDrafts.Update(draft);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(GradeDraft draft)
    {
        _context.GradeDrafts.Remove(draft);
        await _context.SaveChangesAsync();
    }
}
