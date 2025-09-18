using StudentPortal.Dtos;


namespace StudentPortal.Interfaces;

public interface ISubjectService
{
    Task<IEnumerable<SubjectDto>> GetAllSubjectsAsync();
    Task<SubjectDto> GetSubjectByIdAsync(int id);
    Task<SubjectDto> AddSubjectAsync(SubjectCreateDto subjectDto);
    Task<SubjectDto> UpdateSubjectAsync(int id, SubjectUpdateDto subjectDto);
    Task<bool> DeleteSubjectAsync(int id);

    Task<IEnumerable<SubjectDto>> GetSubjectsByProfessorIdAsync(int professorId);
    Task<IEnumerable<UserDto>> GetStudentsBySubjectIdAsync(int subjectId);
}