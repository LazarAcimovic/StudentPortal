using System;
using System.Collections.Generic;

namespace StudentPortal.Models.Entities;

public class Enrollment
{
    public Guid Id { get; set; }

    public Guid StudentId { get; set; }

    public Guid SubjectId { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? EnrolledAt { get; set; }

    public virtual IEnumerable<Grade> Grades { get; set; } = new List<Grade>();

    public virtual User Student { get; set; }

    public virtual Subject Subject { get; set; }
}
