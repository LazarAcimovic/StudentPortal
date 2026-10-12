using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

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
                .ThenInclude(g => g.Enrollment)
                    .ThenInclude(e => e.Subject)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<IEnumerable<Appeal>> GetByGradeIdAsync(Guid gradeId)
    {
        return await _context.Appeals
            .Where(a => a.GradeId == gradeId)
            .OrderBy(a => a.SubmittedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Appeal>> GetPendingByProfessorIdAsync(Guid professorId)
    {
        return await _context.Appeals
            .Include(a => a.Grade)
                .ThenInclude(g => g.Enrollment)
                    .ThenInclude(e => e.Subject)
            .Include(a => a.Grade)
                .ThenInclude(g => g.Enrollment)
                    .ThenInclude(e => e.Student)
            .Where(a => a.Status == AppealStatus.Pending &&
                        a.Grade.Enrollment.Subject.ProfessorId == professorId)
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

    public async Task<IEnumerable<Appeal>> GetAppealsByProfessorIdForDashboardAsync(Guid professorId)
    {
        var undoCutoff = DateTime.UtcNow.AddHours(-24);
        return await _context.Appeals
            .Include(a => a.Grade)
                .ThenInclude(g => g.Enrollment)
                    .ThenInclude(e => e.Student)
            .Include(a => a.Grade)
                .ThenInclude(g => g.Enrollment)
                    .ThenInclude(e => e.Subject)
            .Where(a => a.Grade.Enrollment.Subject.ProfessorId == professorId &&
                        (a.Status == AppealStatus.Pending ||
                         (a.Status == AppealStatus.Denied &&
                          a.ReviewedAt != null && a.ReviewedAt > undoCutoff)))
            .OrderBy(a => a.SubmittedAt)
            .AsNoTracking()
            .ToListAsync();
    }
}
