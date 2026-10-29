using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class SubjectServiceTests
{
    private readonly ISubjectRepository _subjectRepo = Substitute.For<ISubjectRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IMapper _mapper = TestMapper.Create();

    private SubjectService CreateSut() => new(_subjectRepo, _userRepo, _mapper);

    private static User MakeProfessor(Guid id, bool isDeleted) => new()
    {
        Id = id,
        FirstName = "Pro",
        LastName = "Fessor",
        Email = "pro@example.com",
        UserRole = RoleEnum.Professor,
        IsDeleted = isDeleted,
    };

    private static SubjectCreateDto MakeDto(Guid professorId) => new()
    {
        SubjectName = "Databases",
        SubjectCode = "CS101",
        ECTS = 6,
        ProfessorId = professorId,
    };

    [Fact]
    public async Task AddSubjectAsync_SoftDeletedProfessor_ReturnsNullAndDoesNotPersist()
    {
        // A soft-deleted (inactive) user cannot be assigned as a subject's professor.
        var professorId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(professorId).Returns(MakeProfessor(professorId, isDeleted: true));

        var sut = CreateSut();

        var result = await sut.AddSubjectAsync(MakeDto(professorId));

        Assert.Null(result);
        await _subjectRepo.DidNotReceiveWithAnyArgs().AddSubjectAsync(default);
    }

    [Fact]
    public async Task AddSubjectAsync_UnknownProfessor_ReturnsNullAndDoesNotPersist()
    {
        var professorId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(professorId).Returns((User)null);

        var sut = CreateSut();

        var result = await sut.AddSubjectAsync(MakeDto(professorId));

        Assert.Null(result);
        await _subjectRepo.DidNotReceiveWithAnyArgs().AddSubjectAsync(default);
    }

    [Fact]
    public async Task AddSubjectAsync_ActiveProfessor_PersistsAndReturnsDto()
    {
        var professorId = Guid.NewGuid();
        _userRepo.GetUserByIdAsync(professorId).Returns(MakeProfessor(professorId, isDeleted: false));
        _subjectRepo.AddSubjectAsync(Arg.Any<Subject>()).Returns(ci => ci.Arg<Subject>());

        var sut = CreateSut();

        var result = await sut.AddSubjectAsync(MakeDto(professorId));

        Assert.NotNull(result);
        await _subjectRepo.Received(1).AddSubjectAsync(Arg.Any<Subject>());
    }
}
