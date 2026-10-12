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

    private static User MakeProfessor() => new()
    {
        Id = Guid.NewGuid(), FirstName = "Prof", LastName = "Essor",
        Email = "p@example.com", UserRole = RoleEnum.Professor,
    };

    // ---------- AddSubjectAsync ----------

    [Fact]
    public async Task AddSubjectAsync_HappyPath_PersistsSubject()
    {
        var prof = MakeProfessor();
        _userRepo.GetUserByIdAsync(prof.Id).Returns(prof);
        _subjectRepo.AddSubjectAsync(Arg.Any<Subject>()).Returns(ci =>
        {
            var s = ci.Arg<Subject>();
            s.Professor = prof;
            return s;
        });

        var sut = CreateSut();

        var dto = await sut.AddSubjectAsync(new SubjectCreateDto
        {
            SubjectName = "AI", ECTS = 6, ProfessorId = prof.Id,
        });

        Assert.NotNull(dto);
        Assert.Equal("AI", dto!.SubjectName);
        await _subjectRepo.Received(1).AddSubjectAsync(Arg.Is<Subject>(s =>
            s.SubjectName == "AI" && s.ECTS == 6 && s.ProfessorId == prof.Id));
    }

    [Fact]
    public async Task AddSubjectAsync_UnknownProfessor_ReturnsNullAndDoesNotPersist()
    {
        _userRepo.GetUserByIdAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        var dto = await sut.AddSubjectAsync(new SubjectCreateDto
        {
            SubjectName = "AI", ECTS = 6, ProfessorId = Guid.NewGuid(),
        });

        Assert.Null(dto);
        await _subjectRepo.DidNotReceiveWithAnyArgs().AddSubjectAsync(default);
    }

    // ---------- UpdateSubjectAsync ----------

    [Fact]
    public async Task UpdateSubjectAsync_ExistingSubject_UpdatesAndReturnsDto()
    {
        var existing = new Subject
        {
            Id = Guid.NewGuid(), SubjectName = "Old", ECTS = 6, ProfessorId = Guid.NewGuid(),
            Professor = new User { FirstName = "Prof", LastName = "A" },
        };
        _subjectRepo.GetSubjectByIdAsync(existing.Id).Returns(existing, new Subject
        {
            Id = existing.Id, SubjectName = "New", ECTS = 7, ProfessorId = existing.ProfessorId,
            Professor = new User { FirstName = "Prof", LastName = "A" },
        });

        var sut = CreateSut();

        var dto = await sut.UpdateSubjectAsync(existing.Id, new SubjectUpdateDto
        {
            Id = existing.Id, SubjectName = "New", ECTS = 7, ProfessorId = existing.ProfessorId,
        });

        Assert.NotNull(dto);
        Assert.Equal("New", dto!.SubjectName);
        await _subjectRepo.Received(1).UpdateSubjectAsync(Arg.Any<Subject>());
    }

    [Fact]
    public async Task UpdateSubjectAsync_UnknownSubject_ReturnsNull()
    {
        _subjectRepo.GetSubjectByIdAsync(Arg.Any<Guid>()).Returns((Subject)null);
        var sut = CreateSut();

        var dto = await sut.UpdateSubjectAsync(Guid.NewGuid(), new SubjectUpdateDto());

        Assert.Null(dto);
        await _subjectRepo.DidNotReceiveWithAnyArgs().UpdateSubjectAsync(default);
    }

    // ---------- DeleteSubjectAsync ----------

    [Fact]
    public async Task DeleteSubjectAsync_ExistingSubject_ReturnsTrueAndCallsRepo()
    {
        var id = Guid.NewGuid();
        _subjectRepo.GetSubjectByIdAsync(id).Returns(new Subject { Id = id });
        var sut = CreateSut();

        var result = await sut.DeleteSubjectAsync(id);

        Assert.True(result);
        await _subjectRepo.Received(1).DeleteSubjectAsync(id);
    }

    [Fact]
    public async Task DeleteSubjectAsync_UnknownSubject_ReturnsFalseAndDoesNotCallRepo()
    {
        _subjectRepo.GetSubjectByIdAsync(Arg.Any<Guid>()).Returns((Subject)null);
        var sut = CreateSut();

        var result = await sut.DeleteSubjectAsync(Guid.NewGuid());

        Assert.False(result);
        await _subjectRepo.DidNotReceiveWithAnyArgs().DeleteSubjectAsync(default);
    }

    // ---------- GetSubjectByIdAsync ----------

    [Fact]
    public async Task GetSubjectByIdAsync_UnknownSubject_ReturnsNull()
    {
        _subjectRepo.GetSubjectByIdAsync(Arg.Any<Guid>()).Returns((Subject)null);
        var sut = CreateSut();

        var dto = await sut.GetSubjectByIdAsync(Guid.NewGuid());

        Assert.Null(dto);
    }
}
