using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IEscalationAssignmentRepository
{
    Task<EscalationAssignment?> GetActiveByEscalationIdAsync(Guid escalationId);
    Task<IEnumerable<EscalationAssignment>> GetAllByEscalationIdAsync(Guid escalationId);
    Task<EscalationAssignment> AddAsync(EscalationAssignment assignment);
    Task UpdateAsync(EscalationAssignment assignment);
}
