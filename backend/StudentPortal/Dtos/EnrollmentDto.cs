namespace StudentPortal.Dtos
{
    public class EnrollmentDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentFirstName { get; set; }
        public string StudentLastName { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; }

        public bool IsDeleted { get; set; }
        public DateTime? EnrolledAt { get; set; }

        
    }
}
