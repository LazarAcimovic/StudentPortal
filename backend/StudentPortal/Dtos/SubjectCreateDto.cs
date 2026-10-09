namespace StudentPortal.Dtos
{
    public class SubjectCreateDto
    {
        public string SubjectName { get; set; }
        public int ECTS { get; set; }
        public Guid ProfessorId { get; set; }
    }
}
