using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IProfessorDashboardService
{
    Task<ProfessorDashboardDto> GetDashboardAsync(Guid professorId);
}
