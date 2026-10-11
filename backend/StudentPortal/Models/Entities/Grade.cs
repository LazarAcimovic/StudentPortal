using System;

namespace StudentPortal.Models.Entities;

public class Grade
{
    public Guid Id { get; set; }

    public Guid EnrollmentId { get; set; }

    public decimal Midterm1Points { get; set; }

    public decimal Midterm2Points { get; set; }

    public decimal AttendancePoints { get; set; }

    public decimal PracticalPoints { get; set; }

    public decimal ExamPoints { get; set; }

    public int FinalGrade { get; set; }

    public DateTime ConfirmedAt { get; set; }

    public DateTime? StudentConfirmedAt { get; set; }

    public DateTime? FinalizedAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public virtual Enrollment Enrollment { get; set; }
}
