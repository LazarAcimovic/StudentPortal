using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IEscalationService
{
    Task<IEnumerable<EscalatedCaseDto>> GetAllCasesAsync(DateTime now);
    Task<IEnumerable<UserDto>> GetEligibleProfessorsAsync(Guid gradeId);
    Task<EscalatedCaseDto> AssignProfessorAsync(Guid gradeId, Guid assignedProfessorId, Guid adminId, DateTime now);
    Task<EscalatedCaseDto> ReassignProfessorAsync(Guid gradeId, Guid newProfessorId, Guid adminId, DateTime now);
    Task CloseIfEscalatedAsync(Guid gradeId, DateTime now);
}
