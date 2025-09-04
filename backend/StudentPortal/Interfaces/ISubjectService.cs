using StudentPortal.Dtos;


namespace StudentPortal.Interfaces;

public interface ISubjectService
{
    Task<IEnumerable<SubjectDto>> GetAllSubjectsAsync();
    Task<SubjectDto> GetSubjectByIdAsync(int id);
    Task<SubjectDto> AddSubjectAsync(SubjectCreateDto subjectDto);
    Task<bool> UpdateSubjectAsync(int id, SubjectUpdateDto subjectDto);
    Task<bool> DeleteSubjectAsync(int id);
}