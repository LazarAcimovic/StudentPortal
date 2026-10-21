using System;
using System.Collections.Generic;
using StudentPortal.Models.Enums;

namespace StudentPortal.Models.Entities;

public class Escalation
{
    public Guid Id { get; set; }

    public Guid GradeId { get; set; }

    public EscalationReason Reason { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public virtual Grade Grade { get; set; }

    public virtual ICollection<EscalationAssignment> Assignments { get; set; } = new List<EscalationAssignment>();
}
