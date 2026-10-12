namespace StudentPortal.Dtos;

public class AppealDto
{
    public Guid Id { get; set; }
    public Guid GradeId { get; set; }
    public Guid EnrollmentId { get; set; }
    public string Text { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string Status { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? StudentFirstName { get; set; }
    public string? StudentLastName { get; set; }
    public string? SubjectName { get; set; }
}
