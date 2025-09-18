using StudentPortal.Models.Entities;
using StudentPortal.Dtos;

namespace StudentPortal.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDto> GetUserByIdAsync(int id);
    Task<UserDto> FindByEmailAsync(string email);
    Task<UserDto> AddUserAsync(UserCreateDto userDto);
    Task<UserDto> UpdateUserAsync(int id, UserUpdateDto userDto); 
    Task<bool> DeleteUserAsync(int id);

    Task<IEnumerable<StudentSubjectGradesDto>> GetStudentSubjectsAndGradesAsync(int studentId);
}