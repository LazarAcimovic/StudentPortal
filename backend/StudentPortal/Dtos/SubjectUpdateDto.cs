namespace StudentPortal.Dtos
{
    public class SubjectUpdateDto
    {
        public string SubjectName { get; set; }
        public int Etcs { get; set; }
        public int ProfessorId { get; set; }

        public bool isDeleted { get; set; }
    }
}
