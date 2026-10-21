using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class EscalationAssignmentRepository : IEscalationAssignmentRepository
{
    private readonly StudentPortalApiContext _context;

    public EscalationAssignmentRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<EscalationAssignment?> GetActiveByEscalationIdAsync(Guid escalationId)
    {
        return await _context.EscalationAssignments
            .FirstOrDefaultAsync(a => a.EscalationId == escalationId && a.SupersededAt == null);
    }

    public async Task<IEnumerable<EscalationAssignment>> GetAllByEscalationIdAsync(Guid escalationId)
    {
        return await _context.EscalationAssignments
            .Where(a => a.EscalationId == escalationId)
            .OrderBy(a => a.AssignedAt)
            .ToListAsync();
    }

    public async Task<EscalationAssignment> AddAsync(EscalationAssignment assignment)
    {
        await _context.EscalationAssignments.AddAsync(assignment);
        await _context.SaveChangesAsync();
        return assignment;
    }

    public async Task UpdateAsync(EscalationAssignment assignment)
    {
        _context.EscalationAssignments.Update(assignment);
        await _context.SaveChangesAsync();
    }
}
