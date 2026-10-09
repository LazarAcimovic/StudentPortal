namespace StudentPortal.Dtos
{
    public class GradeCreateDto
    {
        public Guid EnrollmentId { get; set; }
        public int StudentGrade { get; set; }
        public string Comment { get; set; }

       // public int StudentId { get; set; }

       // public int SubjectId { get; set; }
    }
}
