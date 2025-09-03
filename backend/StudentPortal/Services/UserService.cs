using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;

using StudentPortal.Models.Entities;


namespace StudentPortal.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public UserService(IUserRepository userRepository, IMapper mapper)
    {
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllUsersAsync();
        return _mapper.Map<IEnumerable<UserDto>>(users);
    }

    public async Task<UserDto> GetUserByIdAsync(int id)
    {
        var user = await _userRepository.GetUserByIdAsync(id);
        if (user == null)
        {
            return null;
        }
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> AddUserAsync(UserCreateDto userDto)
    {
        var user = _mapper.Map<User>(userDto);

        await _userRepository.AddUserAsync(user);

        
        return _mapper.Map<UserDto>(user);
    }

    public async Task<bool> UpdateUserAsync(int id, UserUpdateDto userDto)
    {
        var userToUpdate = await _userRepository.GetUserByIdAsync(id);
        if (userToUpdate == null) return false;

        // Mapiranje DTO-a na entitet.
        // AutoMapper će automatski ignorisati null polja
        _mapper.Map(userDto, userToUpdate);

        // Validacija
        // ...

        await _userRepository.UpdateUserAsync(userToUpdate);
        return true;
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var userToDelete = await _userRepository.GetUserByIdAsync(id);
        if (userToDelete == null) return false;

        await _userRepository.DeleteUserAsync(id);
        return true;
    }
}

