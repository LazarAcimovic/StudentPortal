using StudentPortal.Models.Entities;
using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDto> GetUserByIdAsync(Guid id);
    Task<UserDto> FindByEmailAsync(string email);
    Task<UserDto> AddUserAsync(AdminCreateUserDto userDto);
    Task<UserDto> UpdateUserAsync(Guid id, AdminUpdateUserDto userDto);
    Task<bool> DeleteUserAsync(Guid id);

    Task<IEnumerable<StudentSubjectGradesDto>> GetStudentSubjectsAndGradesAsync(Guid studentId);
}