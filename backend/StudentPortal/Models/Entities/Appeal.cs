using System;
using StudentPortal.Models.Enums;

namespace StudentPortal.Models.Entities;

public class Appeal
{
    public Guid Id { get; set; }

    public Guid GradeId { get; set; }

    public string Text { get; set; }

    public DateTime SubmittedAt { get; set; }

    public AppealStatus Status { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public virtual Grade Grade { get; set; }
}
