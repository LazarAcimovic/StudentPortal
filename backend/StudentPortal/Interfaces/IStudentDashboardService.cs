using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IStudentDashboardService
{
    Task<StudentDashboardDto> GetDashboardAsync(Guid studentId);
}
