using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<User> GetUserByIdAsync(Guid id);
        Task<User> FindByEmailAsync(string email);
        Task AddUserAsync(User user);
        Task UpdateUserAsync(User user);
        Task DeleteUserAsync(Guid id);

        Task<IEnumerable<Enrollment>> GetStudentEnrollmentsWithDetailsAsync(Guid studentId);
    }
}
