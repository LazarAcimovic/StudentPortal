using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
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
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository userRepository, IRefreshTokenRepository refreshTokenRepository, IMapper mapper, ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _mapper = mapper;
        _logger = logger;
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

        if (dto.Email != null && !string.Equals(dto.Email, user.Email, StringComparison.OrdinalIgnoreCase) && user.UserRole != RoleEnum.Admin)
            throw new ForbiddenAccessException("Only admins can change their email.");

        if (dto.Email != null && !string.Equals(dto.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var taken = await _userRepository.FindByEmailAsync(dto.Email);
            if (taken != null && taken.Id != callerId)
                throw new EmailAlreadyExistsException("A user with this email already exists.");
        }

        if (dto.FirstName != null) user.FirstName = dto.FirstName;
        if (dto.LastName != null) user.LastName = dto.LastName;
        if (dto.Email != null) user.Email = dto.Email;

        try
        {
            await _userRepository.UpdateUserAsync(user);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
            throw new EmailAlreadyExistsException("A user with this email already exists.");
        }

        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> AdminUpdateUserAsync(Guid targetId, Guid callerId, AdminUpdateUserDto dto)
    {
        var target = await _userRepository.GetUserByIdForUpdateAsync(targetId);
        if (target == null) return null;

        if (targetId == callerId && dto.IsDeleted)
            throw new ForbiddenAccessException("Admin cannot soft-delete themselves.");

        if (!string.Equals(dto.Email, target.Email, StringComparison.OrdinalIgnoreCase))
        {
            var taken = await _userRepository.FindByEmailAsync(dto.Email);
            if (taken != null && taken.Id != targetId)
                throw new EmailAlreadyExistsException("A user with this email already exists.");
        }

        var softDeleted = dto.IsDeleted && !target.IsDeleted;

        target.FirstName = dto.FirstName;
        target.LastName = dto.LastName;
        target.Email = dto.Email;
        target.IsDeleted = dto.IsDeleted;

        // Role is immutable on update (deferred to a later MVP, per D-048), so IndexNumber
        // tracks the user's existing role: a student keeps/updates it, anyone else has none.
        if (target.UserRole == RoleEnum.Student)
            target.IndexNumber = dto.IndexNumber;
        else
            target.IndexNumber = null;

        try
        {
            await _userRepository.UpdateUserAsync(target);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
            throw new EmailAlreadyExistsException("A user with this email already exists.");
        }

        // Soft-deleting a user is an authority change: revoke every refresh row for the
        // target (D-043) so a disabled user cannot mint fresh access tokens via /Refresh.
        // Only when IsDeleted actually flips — not on a name/email-only save.
        if (softDeleted)
        {
            await _refreshTokenRepository.RevokeAllForUserAsync(targetId);
            _logger.LogInformation("User soft-deleted: UserId {TargetId} by AdminId {CallerId}", targetId, callerId);
        }

        return _mapper.Map<UserDto>(target);
    }

    public async Task<bool> DeleteUserAsync(Guid id)
    {
        var userToDelete = await _userRepository.GetUserByIdAsync(id);
        if (userToDelete == null) return false;

        // Deleting a user is an authority change: revoke their refresh rows (D-043).
        await _refreshTokenRepository.RevokeAllForUserAsync(id);
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
        _logger.LogInformation("Password changed for UserId {UserId}", callerId);
    }

    public async Task<PagedResultDto<AdminUserDto>> GetPagedAsync(int page, int pageSize)
    {
        var (users, totalCount) = await _userRepository.GetPagedAsync(page, pageSize);
        return new PagedResultDto<AdminUserDto>
        {
            Items = _mapper.Map<IReadOnlyList<AdminUserDto>>(users),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<PagedResultDto<UserSearchResultDto>> SearchAsync(RoleEnum role, string? query, int page, int pageSize)
    {
        var (items, totalCount) = await _userRepository.SearchAsync(role, query, page, pageSize);
        return new PagedResultDto<UserSearchResultDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
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
