using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class AppealRepository : IAppealRepository
{
    private readonly StudentPortalApiContext _context;

    public AppealRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<Appeal?> GetByIdAsync(Guid id)
    {
        return await _context.Appeals
            .Include(a => a.Grade)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<IEnumerable<Appeal>> GetByGradeIdAsync(Guid gradeId)
    {
        return await _context.Appeals
            .Where(a => a.GradeId == gradeId)
            .OrderBy(a => a.SubmittedAt)
            .ToListAsync();
    }

    public async Task<Appeal> AddAsync(Appeal appeal)
    {
        await _context.Appeals.AddAsync(appeal);
        await _context.SaveChangesAsync();
        return appeal;
    }

    public async Task UpdateAsync(Appeal appeal)
    {
        _context.Appeals.Update(appeal);
        await _context.SaveChangesAsync();
    }
}
