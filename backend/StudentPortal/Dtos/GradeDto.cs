namespace StudentPortal.Dtos
{
    public class GradeDto
    {
        public int Id { get; set; }
        public int GradeValue { get; set; }
        public string Comment { get; set; }
        public string StudentFirstName { get; set; }
        public string StudentLastName { get; set; }
        public string SubjectName { get; set; }
    }
}
