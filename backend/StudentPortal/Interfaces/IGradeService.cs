using StudentPortal.Dtos;
using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IGradeService
{
    Task<IEnumerable<GradeDto>> GetAllGradesAsync();
    Task<IEnumerable<GradeDto>> GetGradesByStudentIdAsync(int studentId);
    Task<GradeDto> GetGradeByIdAsync(int id);
    Task<IEnumerable<GradeDto>> GetGradesByStudentAndSubjectAsync(int studentId, int subjectId);
    Task<GradeDto> AddGradeAsync(GradeCreateDto gradeDto);
    Task<GradeDto> UpdateGradeAsync(int id, GradeUpdateDto gradeDto);
    Task<bool> DeleteGradeAsync(int id);
    Task<GradeDto> ConfirmGradeAsync(int id);
}