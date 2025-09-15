namespace StudentPortal.Dtos
{
    public class SubjectUpdateDto
    {
        public int Id { get; set; }
        public string SubjectName { get; set; }
        public int ECTS { get; set; }
        public int ProfessorId { get; set; }

        public bool IsDeleted { get; set; }
    }
}
