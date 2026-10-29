using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;


namespace StudentPortal.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IMapper _mapper;

    public UserService(IUserRepository userRepository, IRefreshTokenRepository refreshTokenRepository, IMapper mapper)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllUsersAsync();
        return _mapper.Map<IEnumerable<UserDto>>(users);
    }

    public async Task<UserDto> GetUserByIdAsync(Guid id)
    {
        var user = await _userRepository.GetUserByIdAsync(id);
        if (user == null)
        {
            return null;
        }
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> FindByEmailAsync(string email)
    {
        var user = await _userRepository.FindByEmailAsync(email);
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> AddUserAsync(AdminCreateUserDto userDto)
    {
        var existing = await _userRepository.FindByEmailAsync(userDto.Email);
        if (existing != null)
            throw new EmailAlreadyExistsException("A user with this email already exists.");

        var hashedPassword = PasswordHashHandler.HashPassword(userDto.Password);
        userDto.Password = hashedPassword;


        var user = _mapper.Map<User>(userDto);


        await _userRepository.AddUserAsync(user);


        return _mapper.Map<UserDto>(user);
    }


public async Task<UserDto> UpdateProfileAsync(Guid callerId, UpdateProfileDto dto)
    {
        var user = await _userRepository.GetUserByIdForUpdateAsync(callerId);
        if (user == null) return null;

        if (dto.Email != null && dto.Email != user.Email && user.UserRole != RoleEnum.Admin)
            throw new ForbiddenAccessException("Only admins can change their email.");

        if (dto.FirstName != null) user.FirstName = dto.FirstName;
        if (dto.LastName != null) user.LastName = dto.LastName;
        if (dto.Email != null) user.Email = dto.Email;

        await _userRepository.UpdateUserAsync(user);
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> AdminUpdateUserAsync(Guid targetId, Guid callerId, AdminUpdateUserDto dto)
    {
        var target = await _userRepository.GetUserByIdForUpdateAsync(targetId);
        if (target == null) return null;

        if (targetId == callerId && dto.IsDeleted)
            throw new ForbiddenAccessException("Admin cannot soft-delete themselves.");

        if (targetId == callerId && dto.UserRole != target.UserRole)
            throw new ForbiddenAccessException("Admin cannot change their own role.");

        if (target.UserRole == RoleEnum.Admin && dto.UserRole != RoleEnum.Admin)
            throw new ForbiddenAccessException("Admin cannot demote another admin.");

        target.FirstName = dto.FirstName;
        target.LastName = dto.LastName;
        target.Email = dto.Email;
        target.UserRole = dto.UserRole;
        target.IsDeleted = dto.IsDeleted;

        if (target.UserRole == RoleEnum.Student)
            target.IndexNumber = dto.IndexNumber;
        else
            target.IndexNumber = null;

        await _userRepository.UpdateUserAsync(target);
        return _mapper.Map<UserDto>(target);
    }

    public async Task<bool> DeleteUserAsync(Guid id)
    {
        var userToDelete = await _userRepository.GetUserByIdAsync(id);
        if (userToDelete == null) return false;

        await _userRepository.DeleteUserAsync(id);
        return true;
    }

    public async Task ChangePasswordAsync(Guid callerId, ChangePasswordDto dto)
    {
        var user = await _userRepository.GetUserByIdForUpdateAsync(callerId);
        if (user == null) return;

        if (!PasswordHashHandler.VerifyPassword(dto.CurrentPassword, user.UserPassword))
            throw new InvalidOperationException("Current password is incorrect.");

        user.UserPassword = PasswordHashHandler.HashPassword(dto.NewPassword);
        await _userRepository.UpdateUserAsync(user);
        await _refreshTokenRepository.RevokeAllForUserAsync(callerId);
    }

    public async Task<IEnumerable<StudentSubjectGradesDto>> GetStudentSubjectsAndGradesAsync(Guid studentId)
    {
        // Koristimo novu metodu iz UserRepository-a
        var enrollments = await _userRepository.GetStudentEnrollmentsWithDetailsAsync(studentId);

        if (enrollments == null || !enrollments.Any())
        {
            return Enumerable.Empty<StudentSubjectGradesDto>();
        }

        var studentSubjectData = new List<StudentSubjectGradesDto>();

        foreach (var enrollment in enrollments)
        {
            studentSubjectData.Add(new StudentSubjectGradesDto
            {
                EnrollmentId = enrollment.Id,
                // Mapiramo Subject entitet u SubjectDto
                Subject = _mapper.Map<SubjectDto>(enrollment.Subject),
                Grades = enrollment.Grade != null && !enrollment.Grade.IsDeleted
                    ? new List<GradeDto> { _mapper.Map<GradeDto>(enrollment.Grade) }
                    : new List<GradeDto>()
            });
        }

        return studentSubjectData;
    }
}

