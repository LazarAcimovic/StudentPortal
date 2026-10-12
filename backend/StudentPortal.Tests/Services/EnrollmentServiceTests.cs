using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class EnrollmentServiceTests
{
    private readonly IEnrollmentRepository _enrollRepo = Substitute.For<IEnrollmentRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly ISubjectRepository _subjectRepo = Substitute.For<ISubjectRepository>();
    private readonly IMapper _mapper = TestMapper.Create();

    private EnrollmentService CreateSut() => new(_enrollRepo, _userRepo, _subjectRepo, _mapper);

    private static User MakeStudent(bool isDeleted = false) => new()
    {
        Id = Guid.NewGuid(), FirstName = "Stu", LastName = "Dent",
        Email = "s@example.com", IndexNumber = "2026/0001",
        UserRole = RoleEnum.Student, IsDeleted = isDeleted,
    };

    private static Subject MakeSubject(bool isDeleted = false, Guid? professorId = null) => new()
    {
        Id = Guid.NewGuid(), SubjectName = "AI", ECTS = 6,
        ProfessorId = professorId ?? Guid.NewGuid(), IsDeleted = isDeleted,
        Professor = new User { FirstName = "Pro", LastName = "Fessor" },
    };

    // ---------- AddEnrollmentAsync ----------

    [Fact]
    public async Task AddEnrollmentAsync_HappyPath_CreatesEnrollment()
    {
        var student = MakeStudent();
        var subject = MakeSubject();
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _subjectRepo.GetSubjectByIdAsync(subject.Id).Returns(subject);
        _enrollRepo.GetEnrollmentByStudentAndSubjectIdAsync(student.Id, subject.Id).Returns((Enrollment)null);
        _enrollRepo.AddEnrollmentAsync(Arg.Any<Enrollment>()).Returns(ci =>
        {
            var e = ci.Arg<Enrollment>();
            e.Student = student;
            e.Subject = subject;
            return e;
        });

        var sut = CreateSut();

        var dto = await sut.AddEnrollmentAsync(new EnrollmentCreateDto { StudentId = student.Id, SubjectId = subject.Id });

        Assert.NotNull(dto);
        await _enrollRepo.Received(1).AddEnrollmentAsync(Arg.Is<Enrollment>(e =>
            e.StudentId == student.Id && e.SubjectId == subject.Id));
    }

    [Fact]
    public async Task AddEnrollmentAsync_UnknownStudent_ReturnsNullAndDoesNotPersist()
    {
        _userRepo.GetUserByIdAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        var dto = await sut.AddEnrollmentAsync(new EnrollmentCreateDto
        {
            StudentId = Guid.NewGuid(), SubjectId = Guid.NewGuid(),
        });

        Assert.Null(dto);
        await _enrollRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_SoftDeletedStudent_ReturnsNull()
    {
        var deletedStudent = MakeStudent(isDeleted: true);
        _userRepo.GetUserByIdAsync(deletedStudent.Id).Returns(deletedStudent);
        var sut = CreateSut();

        var dto = await sut.AddEnrollmentAsync(new EnrollmentCreateDto
        {
            StudentId = deletedStudent.Id, SubjectId = Guid.NewGuid(),
        });

        Assert.Null(dto);
        await _enrollRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_UnknownSubject_ReturnsNull()
    {
        var student = MakeStudent();
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _subjectRepo.GetSubjectByIdAsync(Arg.Any<Guid>()).Returns((Subject)null);
        var sut = CreateSut();

        var dto = await sut.AddEnrollmentAsync(new EnrollmentCreateDto
        {
            StudentId = student.Id, SubjectId = Guid.NewGuid(),
        });

        Assert.Null(dto);
        await _enrollRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    [Fact]
    public async Task AddEnrollmentAsync_SoftDeletedSubject_ReturnsNull()
    {
        var student = MakeStudent();
        var deletedSubject = MakeSubject(isDeleted: true);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _subjectRepo.GetSubjectByIdAsync(deletedSubject.Id).Returns(deletedSubject);
        var sut = CreateSut();

        var dto = await sut.AddEnrollmentAsync(new EnrollmentCreateDto
        {
            StudentId = student.Id, SubjectId = deletedSubject.Id,
        });

        Assert.Null(dto);
    }

    [Fact]
    public async Task AddEnrollmentAsync_DuplicateEnrollment_ReturnsNullAndDoesNotInsert()
    {
        // Enforces the (StudentId, SubjectId) uniqueness invariant at the service layer.
        var student = MakeStudent();
        var subject = MakeSubject();
        var existing = new Enrollment { Id = Guid.NewGuid(), StudentId = student.Id, SubjectId = subject.Id };
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _subjectRepo.GetSubjectByIdAsync(subject.Id).Returns(subject);
        _enrollRepo.GetEnrollmentByStudentAndSubjectIdAsync(student.Id, subject.Id).Returns(existing);

        var sut = CreateSut();

        var dto = await sut.AddEnrollmentAsync(new EnrollmentCreateDto { StudentId = student.Id, SubjectId = subject.Id });

        Assert.Null(dto);
        await _enrollRepo.DidNotReceiveWithAnyArgs().AddEnrollmentAsync(default);
    }

    // ---------- DeleteEnrollmentAsync ----------

    [Fact]
    public async Task DeleteEnrollmentAsync_ExistingEnrollment_DeletesAndReturnsTrue()
    {
        var id = Guid.NewGuid();
        _enrollRepo.GetEnrollmentByIdAsync(id).Returns(new Enrollment { Id = id });
        var sut = CreateSut();

        var result = await sut.DeleteEnrollmentAsync(id);

        Assert.True(result);
        await _enrollRepo.Received(1).DeleteEnrollmentAsync(id);
    }

    [Fact]
    public async Task DeleteEnrollmentAsync_UnknownEnrollment_ReturnsFalseAndDoesNotCallRepo()
    {
        _enrollRepo.GetEnrollmentByIdAsync(Arg.Any<Guid>()).Returns((Enrollment)null);
        var sut = CreateSut();

        var result = await sut.DeleteEnrollmentAsync(Guid.NewGuid());

        Assert.False(result);
        await _enrollRepo.DidNotReceiveWithAnyArgs().DeleteEnrollmentAsync(default);
    }
}
