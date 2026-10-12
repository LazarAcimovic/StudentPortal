using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class UserServiceTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    // Use the real AutoMapper profile so DTO mappings behave as they would in production.
    private readonly IMapper _mapper = TestMapper.Create();

    private UserService CreateSut() => new(_userRepo, _mapper);

    private static User MakeUser(RoleEnum role = RoleEnum.Student, string email = "jane@example.com")
    {
        return new User
        {
            Id = Guid.NewGuid(),
            FirstName = "Jane",
            LastName = "Doe",
            Email = email,
            IndexNumber = role == RoleEnum.Student ? "2020/0001" : null,
            UserRole = role,
            UserPassword = PasswordHashHandler.HashPassword("Password123!"),
        };
    }

    // ---------- AddUserAsync ----------

    [Fact]
    public async Task AddUserAsync_HashesPlainPasswordBeforePersisting()
    {
        // PRD §6: "Password hashing stays as PBKDF2-SHA512 at 100 000 iterations."
        // The service must never persist the plaintext.
        var sut = CreateSut();

        await sut.AddUserAsync(new AdminCreateUserDto
        {
            FirstName = "New", LastName = "Student",
            Email = "new@example.com", Password = "SuperSecret!",
            IndexNumber = "2026/0001", UserRole = RoleEnum.Student,
        });

        await _userRepo.Received(1).AddUserAsync(Arg.Is<User>(u =>
            u.UserPassword != "SuperSecret!" &&
            u.UserPassword.Length > 20 &&
            PasswordHashHandler.VerifyPassword("SuperSecret!", u.UserPassword)));
    }

    // ---------- UpdateProfileAsync (self-service) ----------

    [Fact]
    public async Task UpdateProfileAsync_StudentChangesTheirOwnEmail_IsForbidden()
    {
        // PRD §6: "non-Admin callers cannot change their own Email; attempting to send a different Email returns 403."
        var student = MakeUser(RoleEnum.Student);
        _userRepo.GetUserByIdForUpdateAsync(student.Id).Returns(student);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.UpdateProfileAsync(student.Id, new UpdateProfileDto
            {
                FirstName = "Janet", LastName = "Doe", Email = "new@example.com",
            }));
        await _userRepo.DidNotReceiveWithAnyArgs().UpdateUserAsync(default);
    }

    [Fact]
    public async Task UpdateProfileAsync_StudentUpdatesNameOnly_Succeeds()
    {
        var student = MakeUser(RoleEnum.Student);
        _userRepo.GetUserByIdForUpdateAsync(student.Id).Returns(student);

        var sut = CreateSut();

        var dto = await sut.UpdateProfileAsync(student.Id, new UpdateProfileDto
        {
            FirstName = "Janet", LastName = "Smith", Email = null,
        });

        Assert.Equal("Janet", student.FirstName);
        Assert.Equal("Smith", student.LastName);
        Assert.Equal("jane@example.com", student.Email);  // unchanged
        await _userRepo.Received(1).UpdateUserAsync(student);
    }

    [Fact]
    public async Task UpdateProfileAsync_StudentReSendsSameEmail_IsAllowed()
    {
        // PRD §6: forbidden only when sending a DIFFERENT email.
        var student = MakeUser(RoleEnum.Student, email: "jane@example.com");
        _userRepo.GetUserByIdForUpdateAsync(student.Id).Returns(student);

        var sut = CreateSut();

        var dto = await sut.UpdateProfileAsync(student.Id, new UpdateProfileDto
        {
            FirstName = "Janet", LastName = "Doe", Email = "jane@example.com",
        });

        Assert.Equal("Janet", student.FirstName);
        await _userRepo.Received(1).UpdateUserAsync(student);
    }

    [Fact]
    public async Task UpdateProfileAsync_AdminCanChangeTheirOwnEmail()
    {
        var admin = MakeUser(RoleEnum.Admin);
        _userRepo.GetUserByIdForUpdateAsync(admin.Id).Returns(admin);

        var sut = CreateSut();

        await sut.UpdateProfileAsync(admin.Id, new UpdateProfileDto
        {
            FirstName = admin.FirstName, LastName = admin.LastName,
            Email = "new-admin@example.com",
        });

        Assert.Equal("new-admin@example.com", admin.Email);
        await _userRepo.Received(1).UpdateUserAsync(admin);
    }

    [Fact]
    public async Task UpdateProfileAsync_UserNotFound_ReturnsNull()
    {
        _userRepo.GetUserByIdForUpdateAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        var dto = await sut.UpdateProfileAsync(Guid.NewGuid(), new UpdateProfileDto());

        Assert.Null(dto);
    }

    // ---------- AdminUpdateUserAsync ----------

    [Fact]
    public async Task AdminUpdateUserAsync_AdminSoftDeletesSelf_IsForbidden()
    {
        // PRD §6: "Admin cannot soft-delete himself or demote himself."
        var admin = MakeUser(RoleEnum.Admin);
        _userRepo.GetUserByIdForUpdateAsync(admin.Id).Returns(admin);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.AdminUpdateUserAsync(admin.Id, admin.Id, new AdminUpdateUserDto
            {
                FirstName = admin.FirstName, LastName = admin.LastName, Email = admin.Email,
                UserRole = admin.UserRole, IsDeleted = true,
            }));
        await _userRepo.DidNotReceiveWithAnyArgs().UpdateUserAsync(default);
    }

    [Fact]
    public async Task AdminUpdateUserAsync_AdminChangesOwnRole_IsForbidden()
    {
        // PRD §6: "Admin cannot ... demote himself."
        var admin = MakeUser(RoleEnum.Admin);
        _userRepo.GetUserByIdForUpdateAsync(admin.Id).Returns(admin);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.AdminUpdateUserAsync(admin.Id, admin.Id, new AdminUpdateUserDto
            {
                FirstName = admin.FirstName, LastName = admin.LastName, Email = admin.Email,
                UserRole = RoleEnum.Professor, IsDeleted = false,
            }));
    }

    [Fact]
    public async Task AdminUpdateUserAsync_DemotingAnotherAdmin_IsForbidden()
    {
        // Implementation rule beyond PRD text: an admin cannot demote a fellow admin.
        var adminA = MakeUser(RoleEnum.Admin);
        var adminB = MakeUser(RoleEnum.Admin);
        _userRepo.GetUserByIdForUpdateAsync(adminB.Id).Returns(adminB);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.AdminUpdateUserAsync(adminB.Id, adminA.Id, new AdminUpdateUserDto
            {
                FirstName = adminB.FirstName, LastName = adminB.LastName, Email = adminB.Email,
                UserRole = RoleEnum.Student, IsDeleted = false,
            }));
    }

    [Fact]
    public async Task AdminUpdateUserAsync_PromotingStudentToProfessor_ClearsIndexNumber()
    {
        // PRD §2 implicit: index numbers belong to students only.
        var student = MakeUser(RoleEnum.Student);
        _userRepo.GetUserByIdForUpdateAsync(student.Id).Returns(student);

        var sut = CreateSut();

        await sut.AdminUpdateUserAsync(student.Id, Guid.NewGuid(), new AdminUpdateUserDto
        {
            FirstName = student.FirstName, LastName = student.LastName, Email = student.Email,
            UserRole = RoleEnum.Professor, IsDeleted = false, IndexNumber = "ignored",
        });

        Assert.Equal(RoleEnum.Professor, student.UserRole);
        Assert.Null(student.IndexNumber);
    }

    [Fact]
    public async Task AdminUpdateUserAsync_StudentRole_PersistsIndexNumberFromDto()
    {
        var student = MakeUser(RoleEnum.Student);
        _userRepo.GetUserByIdForUpdateAsync(student.Id).Returns(student);

        var sut = CreateSut();

        await sut.AdminUpdateUserAsync(student.Id, Guid.NewGuid(), new AdminUpdateUserDto
        {
            FirstName = student.FirstName, LastName = student.LastName, Email = student.Email,
            UserRole = RoleEnum.Student, IsDeleted = false, IndexNumber = "2027/0042",
        });

        Assert.Equal("2027/0042", student.IndexNumber);
    }

    [Fact]
    public async Task AdminUpdateUserAsync_TargetNotFound_ReturnsNull()
    {
        _userRepo.GetUserByIdForUpdateAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        var dto = await sut.AdminUpdateUserAsync(Guid.NewGuid(), Guid.NewGuid(), new AdminUpdateUserDto());

        Assert.Null(dto);
    }

    // ---------- ChangePasswordAsync ----------

    [Fact]
    public async Task ChangePasswordAsync_WithCorrectCurrentPassword_UpdatesHash()
    {
        // PRD §6: "Password change requires the correct current password."
        var user = MakeUser();
        var oldHash = user.UserPassword;
        _userRepo.GetUserByIdForUpdateAsync(user.Id).Returns(user);

        var sut = CreateSut();

        await sut.ChangePasswordAsync(user.Id, new ChangePasswordDto
        {
            CurrentPassword = "Password123!",
            NewPassword = "BrandNewPass!",
        });

        Assert.NotEqual(oldHash, user.UserPassword);
        Assert.True(PasswordHashHandler.VerifyPassword("BrandNewPass!", user.UserPassword));
        await _userRepo.Received(1).UpdateUserAsync(user);
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ThrowsAndDoesNotPersist()
    {
        var user = MakeUser();
        var originalHash = user.UserPassword;
        _userRepo.GetUserByIdForUpdateAsync(user.Id).Returns(user);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ChangePasswordAsync(user.Id, new ChangePasswordDto
            {
                CurrentPassword = "WrongPassword", NewPassword = "WhateverNew!",
            }));

        Assert.Equal(originalHash, user.UserPassword);
        await _userRepo.DidNotReceiveWithAnyArgs().UpdateUserAsync(default);
    }

    [Fact]
    public async Task ChangePasswordAsync_UnknownUser_SilentlyReturnsAndDoesNotPersist()
    {
        _userRepo.GetUserByIdForUpdateAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        await sut.ChangePasswordAsync(Guid.NewGuid(), new ChangePasswordDto
        {
            CurrentPassword = "x", NewPassword = "y",
        });

        await _userRepo.DidNotReceiveWithAnyArgs().UpdateUserAsync(default);
    }

    // ---------- DeleteUserAsync ----------

    [Fact]
    public async Task DeleteUserAsync_ExistingUser_ReturnsTrueAndCallsRepo()
    {
        var user = MakeUser();
        _userRepo.GetUserByIdAsync(user.Id).Returns(user);

        var sut = CreateSut();

        var result = await sut.DeleteUserAsync(user.Id);

        Assert.True(result);
        await _userRepo.Received(1).DeleteUserAsync(user.Id);
    }

    [Fact]
    public async Task DeleteUserAsync_UnknownUser_ReturnsFalseAndDoesNotCallRepo()
    {
        _userRepo.GetUserByIdAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        var result = await sut.DeleteUserAsync(Guid.NewGuid());

        Assert.False(result);
        await _userRepo.DidNotReceiveWithAnyArgs().DeleteUserAsync(default);
    }
}
