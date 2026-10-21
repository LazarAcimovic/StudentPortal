using System;

namespace StudentPortal.Models.Entities;

public class EscalationAssignment
{
    public Guid Id { get; set; }

    public Guid EscalationId { get; set; }

    public Guid AssignedProfessorId { get; set; }

    public Guid AssignedByAdminId { get; set; }

    public DateTime AssignedAt { get; set; }

    public DateTime? SupersededAt { get; set; }

    public virtual Escalation Escalation { get; set; }

    public virtual User AssignedProfessor { get; set; }

    public virtual User AssignedByAdmin { get; set; }
}
