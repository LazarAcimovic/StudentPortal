using System;
using System.Collections.Generic;

namespace StudentPortal.Models.Entities;

public  class Grade
{
    public Guid Id { get; set; }

    public Guid EnrollmentId { get; set; }

    public int StudentGrade { get; set; }

    public string Comment { get; set; }

    public DateTime? CreatedAt { get; set; }

    public bool IsConfirmed { get; set; }
    public bool IsDeleted { get; set; }

    public virtual Enrollment Enrollment { get; set; }


}
