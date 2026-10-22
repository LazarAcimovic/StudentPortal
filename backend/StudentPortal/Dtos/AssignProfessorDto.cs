namespace StudentPortal.Dtos;

public class AssignProfessorDto
{
    public Guid GradeId { get; set; }
    public Guid AssignedProfessorId { get; set; }
}

public class ReassignProfessorDto
{
    public Guid GradeId { get; set; }
    public Guid NewProfessorId { get; set; }
}
