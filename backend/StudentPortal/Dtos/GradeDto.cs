namespace StudentPortal.Dtos
{
    public class GradeDto
    {
        public int Id { get; set; }
        public int EnrollmentId { get; set; }
        public int StudentGrade { get; set; }
        public string Comment { get; set; }
        public string StudentFirstName { get; set; }
        public string StudentLastName { get; set; }
        public string SubjectName { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsConfirmed { get; set; }
    }
}
