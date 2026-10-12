using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IAppealService
{
    Task<AppealDto> SubmitAsync(Guid callerStudentId, SubmitAppealDto dto);
    Task<IEnumerable<AppealDto>> GetPendingForProfessorAsync(Guid callerProfId);
    Task<IEnumerable<AppealDto>> GetByGradeAsync(Guid gradeId, Guid callerProfId);
    Task<AppealDto> AcceptAsync(Guid appealId, Guid callerProfId);
    Task<AppealDto> DenyAsync(Guid appealId, Guid callerProfId);
    Task<AppealDto> UndoDenyAsync(Guid appealId, Guid callerProfId);
}
