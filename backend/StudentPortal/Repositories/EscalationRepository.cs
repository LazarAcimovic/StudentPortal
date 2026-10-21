using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class EscalationRepository : IEscalationRepository
{
    private readonly StudentPortalApiContext _context;

    public EscalationRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<Escalation?> GetByGradeIdAsync(Guid gradeId)
    {
        return await _context.Escalations
            .Include(e => e.Assignments)
            .FirstOrDefaultAsync(e => e.GradeId == gradeId);
    }

    public async Task<Escalation> AddAsync(Escalation escalation)
    {
        await _context.Escalations.AddAsync(escalation);
        await _context.SaveChangesAsync();
        return escalation;
    }

    public async Task UpdateAsync(Escalation escalation)
    {
        _context.Escalations.Update(escalation);
        await _context.SaveChangesAsync();
    }
}
