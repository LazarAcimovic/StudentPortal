using StudentPortal.Dtos;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Interfaces
{
    public interface IUserRepository
    {
        Task<User> GetUserByIdAsync(Guid id);
        Task<User> GetUserByIdForUpdateAsync(Guid id);
        Task<User> FindByEmailAsync(string email);
        Task AddUserAsync(User user);
        Task UpdateUserAsync(User user);
        Task DeleteUserAsync(Guid id);

        Task<IEnumerable<Enrollment>> GetStudentEnrollmentsWithDetailsAsync(Guid studentId);
        Task<IEnumerable<User>> GetProfessorsBySubjectCodeAsync(string subjectCode, IEnumerable<Guid> excludeIds);
        Task<(IReadOnlyList<User> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);
        Task<(IReadOnlyList<UserSearchResultDto> Items, int TotalCount)> SearchAsync(RoleEnum role, string? query, int page, int pageSize);
    }
}
