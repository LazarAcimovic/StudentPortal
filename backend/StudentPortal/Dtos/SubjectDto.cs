namespace StudentPortal.Dtos
{
    public class SubjectDto
    {
        public int Id { get; set; }
        public string SubjectName { get; set; }
        public int ECTS { get; set; }
        public int ProfessorId { get; set; }
        public string ProfessorFirstName { get; set; }
        public string ProfessorLastName { get; set; }
        public DateTime? CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }
}
