namespace StudentPortal.Dtos;

public class GradeDraftDto
{
    public Guid EnrollmentId { get; set; }
    public decimal? Midterm1Points { get; set; }
    public decimal? Midterm2Points { get; set; }
    public decimal? AttendancePoints { get; set; }
    public decimal? PracticalPoints { get; set; }
    public decimal? ExamPoints { get; set; }
    public DateTime LastEditedAt { get; set; }
}
