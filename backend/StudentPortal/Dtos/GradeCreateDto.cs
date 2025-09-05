namespace StudentPortal.Dtos
{
    public class GradeCreateDto
    {
        public int EnrollmentId { get; set; }
        public int GradeValue { get; set; }
        public string Comment { get; set; }

        public int StudentId { get; set; }

        public int SubjectId { get; set; }
    }
}
