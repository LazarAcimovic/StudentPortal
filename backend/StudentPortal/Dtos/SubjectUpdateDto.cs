namespace StudentPortal.Dtos
{
    public class SubjectUpdateDto
    {
        public Guid Id { get; set; }
        public string SubjectName { get; set; }
        public int ECTS { get; set; }
        public Guid ProfessorId { get; set; }

        public bool IsDeleted { get; set; }
    }
}
