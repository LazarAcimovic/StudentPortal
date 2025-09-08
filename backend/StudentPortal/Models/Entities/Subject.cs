using System;
using System.Collections.Generic;

namespace StudentPortal.Models.Entities;

public class Subject
{
    public int Id { get; set; }

    public string SubjectName { get; set; } 

    public int Etcs { get; set; }

    public int ProfessorId { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? CreatedAt { get; set; }


    public virtual IEnumerable<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual User Professor { get; set; } //navigation property
}
