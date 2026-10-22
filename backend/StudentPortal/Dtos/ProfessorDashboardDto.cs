namespace StudentPortal.Dtos;

public class ProfessorDashboardDto
{
    public List<ProfessorSubjectDto> Subjects { get; set; } = new();
    public List<ProfessorAppealRowDto> Appeals { get; set; } = new();
    public List<AssignedCaseDto> AssignedCases { get; set; } = new();
}

public class AssignedCaseDto
{
    public Guid EnrollmentId { get; set; }
    public Guid GradeId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string StudentFirstName { get; set; } = null!;
    public string StudentLastName { get; set; } = null!;
    public decimal Midterm1Points { get; set; }
    public decimal Midterm2Points { get; set; }
    public decimal AttendancePoints { get; set; }
    public decimal PracticalPoints { get; set; }
    public decimal ExamPoints { get; set; }
    public int FinalGrade { get; set; }
    public string Reason { get; set; } = null!;
    public List<AppealDto> Appeals { get; set; } = new();
}

public class ProfessorSubjectDto
{
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public int Ects { get; set; }
    public List<ProfessorStudentRowDto> Students { get; set; } = new();
}

public class ProfessorStudentRowDto
{
    public Guid EnrollmentId { get; set; }
    public Guid StudentId { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string? IndexNumber { get; set; }
    // "NotGraded" | "Draft" | "Confirmed" | "ReconfirmNeeded" | "Finalized"
    public string GradeState { get; set; } = null!;
    public int? FinalGrade { get; set; }
    public bool HasActiveAppeal { get; set; }
}

public class ProfessorAppealRowDto
{
    public Guid AppealId { get; set; }
    public Guid GradeId { get; set; }
    public Guid EnrollmentId { get; set; }
    public string StudentFirstName { get; set; } = null!;
    public string StudentLastName { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public string Text { get; set; } = null!;
    public DateTime SubmittedAt { get; set; }
    // "Pending" | "Overdue" | "Denied"
    public string Status { get; set; } = null!;
    public DateTime? ReviewedAt { get; set; }
    public bool CanUndoDeny { get; set; }
    public DateTime? UndoDenyDeadline { get; set; }
}
