namespace StudentPortal.Dtos
{
    public class SubjectCreateDto
    {
        public string SubjectName { get; set; }
        public int ECTS { get; set; }
        public int ProfessorId { get; set; }
    }
}
