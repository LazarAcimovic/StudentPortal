using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class EnrollmentServiceTests
{
    private readonly IEnrollmentRepository _enrollmentRepo = Substitute.For<IEnrollmentRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly ISubjectRepository _subjectRepo = Substitute.For<ISubjectRepository>();
    private readonly IMapper _mapper = TestMapper.Create();

    private EnrollmentService CreateSut() => new(_enrollmentRepo, _userRepo, _subjectRepo, _mapper);

    private static User MakeUser(Guid id, bool isDeleted = false, RoleEnum role = RoleEnum.Student) => new()
    {
        Id = id,
        FirstName = "Stu",
        LastName = "Dent",
        Email = "stu@example.com",
        IndexNumber = "2020/1",
        UserRole = role,
        IsDeleted = isDeleted,
    };

    private static Subject MakeSubject(Guid id, bool isDeleted = false) => new()
    {
        Id = id,
        SubjectName = "Databases",
        SubjectCode = "CS101",
        ECTS = 6,
        ProfessorId = Guid.NewGuid(),
        IsDeleted = isDeleted,
    };

    private static EnrollmentCreateDto Dto(Guid studentId, Guid subjectId) => new()
    {
        StudentId = studentId,
        SubjectId = subjectId,
    };

    [Fact]
    public async Task AddEnrollmentAsync_InactiveStudent_Throws()
    {
        var studentId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(studentId).Returns(MakeUser(studentId, isDeleted: true));

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AddEnrollmentAsync(Dto(studentId, Guid.NewGuid())));
        await _enrollmentRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_NonStudentRole_Throws()
    {
        // Only students may be enrolled; a professor/admin id is rejected.
        var userId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(userId).Returns(MakeUser(userId, role: RoleEnum.Professor));

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AddEnrollmentAsync(Dto(userId, Guid.NewGuid())));
        await _enrollmentRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_InactiveSubject_Throws()
    {
        var studentId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(studentId).Returns(MakeUser(studentId));
        _subjectRepo.GetSubjectByIdAsync(subjectId).Returns(MakeSubject(subjectId, isDeleted: true));

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AddEnrollmentAsync(Dto(studentId, subjectId)));
        await _enrollmentRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_Duplicate_Throws()
    {
        var studentId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(studentId).Returns(MakeUser(studentId));
        _subjectRepo.GetSubjectByIdAsync(subjectId).Returns(MakeSubject(subjectId));
        _enrollmentRepo.GetEnrollmentByStudentAndSubjectIdAsync(studentId, subjectId)
            .Returns(new Enrollment { Id = Guid.NewGuid(), StudentId = studentId, SubjectId = subjectId });

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AddEnrollmentAsync(Dto(studentId, subjectId)));
        await _enrollmentRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_Valid_PersistsAndReturnsDto()
    {
        var studentId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(studentId).Returns(MakeUser(studentId));
        _subjectRepo.GetSubjectByIdAsync(subjectId).Returns(MakeSubject(subjectId));
        _enrollmentRepo.GetEnrollmentByStudentAndSubjectIdAsync(studentId, subjectId).Returns((Enrollment)null);
        _enrollmentRepo.AddEnrollmentAsync(Arg.Any<Enrollment>()).Returns(ci => ci.Arg<Enrollment>());

        var sut = CreateSut();

        var result = await sut.AddEnrollmentAsync(Dto(studentId, subjectId));

        Assert.NotNull(result);
        await _enrollmentRepo.Received(1).AddEnrollmentAsync(Arg.Any<Enrollment>());
    }
}
