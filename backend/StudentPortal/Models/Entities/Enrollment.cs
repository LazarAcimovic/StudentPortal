using System;
using System.Collections.Generic;

namespace StudentPortal.Models.Entities;

public class Enrollment
{
    public int Id { get; set; }

    public int StudentId { get; set; }

    public int SubjectId { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime EnrolledAt { get; set; }

    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    public virtual User Student { get; set; }

    public virtual Subject Subject { get; set; }
}
