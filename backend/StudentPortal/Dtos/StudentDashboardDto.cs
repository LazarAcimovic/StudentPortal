namespace StudentPortal.Dtos;

public class StudentDashboardDto
{
    public StudentProfileDto Profile { get; set; } = null!;
    public StudyStatsDto Stats { get; set; } = null!;
    public List<SubjectRowDto> Subjects { get; set; } = new();
}

public class StudentProfileDto
{
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? IndexNumber { get; set; }
}

public class StudyStatsDto
{
    public double AverageGrade { get; set; }
    public int PassedExams { get; set; }
    public int NonPassedExams { get; set; }
    public int EarnedEcts { get; set; }
}

public class SubjectRowDto
{
    public Guid SubjectId { get; set; }
    public Guid EnrollmentId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string ProfessorName { get; set; } = null!;
    public int Ects { get; set; }
    public int? FinalGrade { get; set; }
    public string Status { get; set; } = null!;
    public string? AppealStatus { get; set; }
    public bool CanWriteAppeal { get; set; }
    public bool CanConfirmGrade { get; set; }
    public DateTime? ConfirmationDeadline { get; set; }
    public Guid? PendingAppealId { get; set; }
    public bool IsEscalated { get; set; }
}
