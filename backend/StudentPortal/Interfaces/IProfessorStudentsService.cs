using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IProfessorStudentsService
{
    Task<PagedResultDto<ProfessorStudentRowDto>> GetPagedStudentsAsync(
        Guid subjectId, Guid professorId, int page, int pageSize);
}
