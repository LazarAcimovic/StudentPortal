using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<User> GetUserByIdAsync(int id);
        Task<User> FindByEmailAsync(string email);
        Task AddUserAsync(User user);
        Task UpdateUserAsync(User user);
        Task DeleteUserAsync(int id);

        Task<IEnumerable<Enrollment>> GetStudentEnrollmentsWithDetailsAsync(int studentId);
    }
}
