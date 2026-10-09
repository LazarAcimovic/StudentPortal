namespace StudentPortal.Dtos
{
    public class GradeUpdateDto
    {
        public Guid EnrollmentId   { get; set; }
        public int StudentGrade { get; set; }
        public string Comment { get; set; }
    }
}
