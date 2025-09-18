namespace StudentPortal.Dtos
{
    public class StudentSubjectGradesDto
    {
        // Odgovara "enrollmentId" na frontendu
        public int EnrollmentId { get; set; }

        // Odgovara "subject" na frontendu, koristi se SubjectDto za detalje predmeta
        public SubjectDto Subject { get; set; }

        // Odgovara "grades" na frontendu, lista ocena za taj predmet
        public ICollection<GradeDto> Grades { get; set; }
    }
}

