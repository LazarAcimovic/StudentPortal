namespace StudentPortal.Dtos
{
    public class EnrollmentDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentFirstName { get; set; }
        public string StudentLastName { get; set; }
        public int SubjectId { get; set; }
        public string SubjectName { get; set; }

        public bool IsDeleted { get; set; }
        public DateTime? EnrolledAt { get; set; }

        
    }
}
