using StudentPortal.Dtos;


namespace StudentPortal.Interfaces;

public interface ISubjectService
{
    Task<SubjectDto> GetSubjectByIdAsync(Guid id);
    Task<SubjectDto> AddSubjectAsync(SubjectCreateDto subjectDto);
    Task<SubjectDto> UpdateSubjectAsync(Guid id, SubjectUpdateDto subjectDto);
    Task<bool> DeleteSubjectAsync(Guid id);


    Task<PagedResultDto<SubjectDto>> GetPagedAsync(int page, int pageSize);
    Task<PagedResultDto<SubjectSearchResultDto>> SearchAsync(string? query, int page, int pageSize);
}