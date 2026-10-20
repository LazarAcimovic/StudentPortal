using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class GradeDraftServiceTests
{
    private readonly IGradeDraftRepository _draftRepo = Substitute.For<IGradeDraftRepository>();
    private readonly IEnrollmentRepository _enrollmentRepo = Substitute.For<IEnrollmentRepository>();

    private GradeDraftService CreateSut() => new(_draftRepo, _enrollmentRepo, TimeProvider.System);

    private static Enrollment MakeEnrollment(Guid enrollmentId, Guid professorId)
    {
        return new Enrollment
        {
            Id = enrollmentId,
            StudentId = Guid.NewGuid(),
            SubjectId = Guid.NewGuid(),
            Subject = new Subject { Id = Guid.NewGuid(), ProfessorId = professorId, SubjectName = "Algorithms" },
            Student = new User { Id = Guid.NewGuid(), FirstName = "Ann", LastName = "Smith" },
        };
    }

    // ---------- GetDraftAsync ----------

    [Fact]
    public async Task GetDraftAsync_EnrollmentNotFound_ThrowsKeyNotFound()
    {
        var profId = Guid.NewGuid();
        var enrollmentId = Guid.NewGuid();
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollmentId).Returns((Enrollment)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => sut.GetDraftAsync(enrollmentId, profId));
        await _draftRepo.DidNotReceiveWithAnyArgs().GetByEnrollmentIdAsync(default);
    }

    [Fact]
    public async Task GetDraftAsync_CallerDoesNotOwnSubject_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() => sut.GetDraftAsync(enrollment.Id, strangerProfId));
        await _draftRepo.DidNotReceiveWithAnyArgs().GetByEnrollmentIdAsync(default);
    }

    [Fact]
    public async Task GetDraftAsync_NoDraftExists_ReturnsNull()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((GradeDraft)null);

        var sut = CreateSut();

        var result = await sut.GetDraftAsync(enrollment.Id, profId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetDraftAsync_DraftExists_ReturnsAllFiveFieldsMapped()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var editedAt = new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);
        var draft = new GradeDraft
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollment.Id,
            Midterm1Points = 25m,
            Midterm2Points = 28m,
            AttendancePoints = 5m,
            PracticalPoints = 4m,
            ExamPoints = 20m,
            LastEditedAt = editedAt,
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(draft);

        var sut = CreateSut();

        var dto = await sut.GetDraftAsync(enrollment.Id, profId);

        Assert.NotNull(dto);
        Assert.Equal(enrollment.Id, dto!.EnrollmentId);
        Assert.Equal(25m, dto.Midterm1Points);
        Assert.Equal(28m, dto.Midterm2Points);
        Assert.Equal(5m, dto.AttendancePoints);
        Assert.Equal(4m, dto.PracticalPoints);
        Assert.Equal(20m, dto.ExamPoints);
        Assert.Equal(editedAt, dto.LastEditedAt);
    }

    // ---------- SaveDraftAsync ----------

    [Fact]
    public async Task SaveDraftAsync_NoExistingDraft_InsertsNewDraftWithAllFiveFields()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((GradeDraft)null);

        var sut = CreateSut();

        var dto = await sut.SaveDraftAsync(enrollment.Id, profId, 20m, 22m, 5m, 3m, 15m);

        await _draftRepo.Received(1).AddAsync(Arg.Is<GradeDraft>(d =>
            d.EnrollmentId == enrollment.Id &&
            d.Midterm1Points == 20m &&
            d.Midterm2Points == 22m &&
            d.AttendancePoints == 5m &&
            d.PracticalPoints == 3m &&
            d.ExamPoints == 15m));
        await _draftRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
        Assert.Equal(20m, dto.Midterm1Points);
    }

    [Fact]
    public async Task SaveDraftAsync_ExistingDraft_UpdatesInPlaceAndDoesNotInsert()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var existing = new GradeDraft
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollment.Id,
            Midterm1Points = 10m,
            Midterm2Points = null,
            AttendancePoints = null,
            PracticalPoints = null,
            ExamPoints = null,
            LastEditedAt = DateTime.UtcNow.AddHours(-1),
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(existing);

        var sut = CreateSut();

        var dto = await sut.SaveDraftAsync(enrollment.Id, profId, 25m, 26m, 4m, 5m, 18m);

        await _draftRepo.Received(1).UpdateAsync(Arg.Is<GradeDraft>(d =>
            d.Id == existing.Id &&
            d.Midterm1Points == 25m &&
            d.Midterm2Points == 26m &&
            d.AttendancePoints == 4m &&
            d.PracticalPoints == 5m &&
            d.ExamPoints == 18m));
        await _draftRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
        Assert.Equal(25m, dto.Midterm1Points);
    }

    [Fact]
    public async Task SaveDraftAsync_AllowsPartialFillWithNulls_PerPrd33()
    {
        // PRD §3.3: "Professor fills ANY SUBSET of the 5 fields → clicks Save draft → values persist."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((GradeDraft)null);

        var sut = CreateSut();

        var dto = await sut.SaveDraftAsync(enrollment.Id, profId, 15m, null, null, null, null);

        await _draftRepo.Received(1).AddAsync(Arg.Is<GradeDraft>(d =>
            d.Midterm1Points == 15m &&
            d.Midterm2Points == null &&
            d.AttendancePoints == null &&
            d.PracticalPoints == null &&
            d.ExamPoints == null));
        Assert.Null(dto.ExamPoints);
    }

    [Fact]
    public async Task SaveDraftAsync_AllFiveFieldsNull_StillPersistsEmptyDraft()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((GradeDraft)null);

        var sut = CreateSut();

        var dto = await sut.SaveDraftAsync(enrollment.Id, profId, null, null, null, null, null);

        await _draftRepo.Received(1).AddAsync(Arg.Any<GradeDraft>());
        Assert.All(new[] { dto.Midterm1Points, dto.Midterm2Points, dto.AttendancePoints, dto.PracticalPoints, dto.ExamPoints },
            Assert.Null);
    }

    [Fact]
    public async Task SaveDraftAsync_SetsLastEditedAtToCurrentUtc()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((GradeDraft)null);

        var sut = CreateSut();

        var before = DateTime.UtcNow;
        var dto = await sut.SaveDraftAsync(enrollment.Id, profId, 10m, 10m, 1m, 1m, 1m);
        var after = DateTime.UtcNow;

        Assert.InRange(dto.LastEditedAt, before, after);
    }

    [Fact]
    public async Task SaveDraftAsync_EnrollmentNotFound_ThrowsAndDoesNotTouchDraftRepo()
    {
        var profId = Guid.NewGuid();
        var enrollmentId = Guid.NewGuid();
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollmentId).Returns((Enrollment)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.SaveDraftAsync(enrollmentId, profId, 10m, 10m, 1m, 1m, 1m));
        await _draftRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
        await _draftRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
    }

    [Fact]
    public async Task SaveDraftAsync_CallerDoesNotOwnSubject_ThrowsForbiddenAndDoesNotPersist()
    {
        // PRD §6: "professor can only touch grades, drafts, and appeals on their own subjects."
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.SaveDraftAsync(enrollment.Id, strangerProfId, 10m, 10m, 1m, 1m, 1m));
        await _draftRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
        await _draftRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
    }
}
