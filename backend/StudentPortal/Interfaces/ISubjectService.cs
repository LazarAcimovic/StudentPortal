using StudentPortal.Dtos;


namespace StudentPortal.Interfaces;

public interface ISubjectService
{
    Task<IEnumerable<SubjectDto>> GetAllSubjectsAsync();
    Task<SubjectDto> GetSubjectByIdAsync(Guid id);
    Task<SubjectDto> AddSubjectAsync(SubjectCreateDto subjectDto);
    Task<SubjectDto> UpdateSubjectAsync(Guid id, SubjectUpdateDto subjectDto);
    Task<bool> DeleteSubjectAsync(Guid id);

    Task<IEnumerable<SubjectDto>> GetSubjectsByProfessorIdAsync(Guid professorId);
    Task<IEnumerable<UserDto>> GetStudentsBySubjectIdAsync(Guid subjectId);
}