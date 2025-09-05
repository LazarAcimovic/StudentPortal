using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IGradeService
{
    Task<IEnumerable<GradeDto>> GetAllGradesAsync();
    Task<IEnumerable<GradeDto>> GetGradesByStudentIdAsync(int studentId);
    Task<GradeDto> AddGradeAsync(GradeCreateDto gradeDto);
    Task<GradeDto> UpdateGradeAsync(int id, GradeUpdateDto gradeDto);
    Task<bool> DeleteGradeAsync(int id);
}