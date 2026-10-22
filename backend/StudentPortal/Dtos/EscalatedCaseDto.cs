namespace StudentPortal.Dtos;

public class EscalatedCaseDto
{
    public Guid GradeId { get; set; }
    public Guid EnrollmentId { get; set; }
    public string SubjectName { get; set; }
    public string SubjectCode { get; set; }
    public string StudentFirstName { get; set; }
    public string StudentLastName { get; set; }
    public string OriginalProfessorFirstName { get; set; }
    public string OriginalProfessorLastName { get; set; }
    public int FinalGrade { get; set; }
    public string Reason { get; set; }
    public string EscalationStatus { get; set; }
    public DateTime EscalatedSince { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<AppealDto> Appeals { get; set; } = new();
    public List<EscalationAssignmentHistoryDto> AssignmentHistory { get; set; } = new();
}

public class EscalationAssignmentHistoryDto
{
    public string AssignedProfessorName { get; set; }
    public string AssignedByAdminName { get; set; }
    public DateTime AssignedAt { get; set; }
    public DateTime? SupersededAt { get; set; }
}
