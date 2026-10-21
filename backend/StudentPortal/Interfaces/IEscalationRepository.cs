using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IEscalationRepository
{
    Task<Escalation?> GetByGradeIdAsync(Guid gradeId);
    Task<Escalation> AddAsync(Escalation escalation);
    Task UpdateAsync(Escalation escalation);
}
