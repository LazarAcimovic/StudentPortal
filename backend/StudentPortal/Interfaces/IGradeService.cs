using StudentPortal.Dtos;
using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeService
{
    Task<IEnumerable<GradeDto>> GetAllGradesAsync();
    Task<IEnumerable<GradeDto>> GetGradesByStudentIdAsync(Guid studentId);
    Task<GradeDto> GetGradeByIdAsync(Guid id);
    Task<IEnumerable<GradeDto>> GetGradesByStudentAndSubjectAsync(Guid studentId, Guid subjectId);
    Task<GradeDto> AddGradeAsync(GradeCreateDto gradeDto);
    Task<GradeDto> UpdateGradeAsync(Guid id, GradeUpdateDto gradeDto);
    Task<bool> DeleteGradeAsync(Guid id);
    Task<GradeDto> ConfirmGradeAsync(Guid id);
}