using StudentPortal.Dtos;

namespace StudentPortal.IntegrationTests.Infrastructure;

[Collection("Integration")]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly IntegrationTestFixture Fixture;

    protected IntegrationTestBase(IntegrationTestFixture fixture)
    {
        Fixture = fixture;
    }

    protected FakeTimeProvider FakeTime => Fixture.FakeTime;

    public virtual async Task InitializeAsync()
    {
        // FakeTimeProvider refuses backward moves, so we advance the clock
        // monotonically by a large step between tests instead. Each test
        // anchors on FakeTime.GetUtcNow() for its own relative timeline.
        var current = Fixture.FakeTime.GetUtcNow();
        var floor = IntegrationTestFixture.InitialFakeTime;
        var next = current < floor ? floor : current.AddYears(1);
        Fixture.FakeTime.SetUtcNow(next);
        await Fixture.ResetAndSeedAsync();
    }

    public virtual Task DisposeAsync() => Task.CompletedTask;

    protected HttpClient CreateAnonymousClient()
    {
        return Fixture.Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost"),
        });
    }

    protected async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password = SeedUsers.Password)
    {
        var client = CreateAnonymousClient();
        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = email, Password = password });
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            $"login as {email} must succeed (got {response.StatusCode}: {await response.Content.ReadAsStringAsync()})");
        return client;
    }

    protected Task<HttpClient> CreateAuthenticatedClientAsync(SeedUser user) =>
        CreateAuthenticatedClientAsync(user.Email, SeedUsers.Password);

    protected static void AssertSetCookie(HttpResponseMessage response, string name)
    {
        response.Headers.TryGetValues("Set-Cookie", out var raw).Should().BeTrue(
            $"response should contain Set-Cookie for '{name}'");
        var cookies = raw!.ToList();
        var cookie = cookies.FirstOrDefault(c => c.StartsWith(name + "=", StringComparison.OrdinalIgnoreCase));
        cookie.Should().NotBeNull($"response should include a Set-Cookie for '{name}'");
        cookie.Should().Contain("httponly", because: $"'{name}' must be HttpOnly");
        cookie.Should().Contain("samesite=strict", because: $"'{name}' must be SameSite=Strict");
    }

    protected static string ExtractCookieValue(HttpResponseMessage response, string name)
    {
        response.Headers.TryGetValues("Set-Cookie", out var raw).Should().BeTrue();
        var cookie = raw!.FirstOrDefault(c => c.StartsWith(name + "=", StringComparison.OrdinalIgnoreCase));
        cookie.Should().NotBeNull($"Set-Cookie must contain '{name}'");
        var kvp = cookie!.Split(';', 2, StringSplitOptions.TrimEntries)[0];
        return kvp.Substring(name.Length + 1);
    }

    // ─── DbContext helpers ────────────────────────────────────────────────
    protected StudentPortalApiContext CreateDbContext() => Fixture.CreateDbContext();

    protected async Task<T> WithDbAsync<T>(Func<StudentPortalApiContext, Task<T>> action)
    {
        using var scope = Fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudentPortalApiContext>();
        return await action(db);
    }

    protected async Task WithDbAsync(Func<StudentPortalApiContext, Task> action)
    {
        using var scope = Fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudentPortalApiContext>();
        await action(db);
    }

    // ─── Backdated seed helpers (per §6.2) ────────────────────────────────

    /// <summary>Creates a confirmed grade for the given enrollment at the specified timestamp.</summary>
    protected async Task<Grade> SeedGradeConfirmedAtAsync(
        Guid enrollmentId,
        DateTime confirmedAt,
        decimal midterm1 = 20m, decimal midterm2 = 20m,
        decimal attendance = 4m, decimal practical = 4m, decimal exam = 20m,
        DateTime? finalizedAt = null,
        DateTime? studentConfirmedAt = null)
    {
        var sum = midterm1 + midterm2 + attendance + practical + exam;
        var finalGrade = sum <= 50 ? 5
            : sum <= 60 ? 6
            : sum <= 70 ? 7
            : sum <= 80 ? 8
            : sum <= 90 ? 9
            : 10;

        var grade = new Grade
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollmentId,
            Midterm1Points = midterm1,
            Midterm2Points = midterm2,
            AttendancePoints = attendance,
            PracticalPoints = practical,
            ExamPoints = exam,
            FinalGrade = finalGrade,
            ConfirmedAt = DateTime.SpecifyKind(confirmedAt, DateTimeKind.Utc),
            StudentConfirmedAt = studentConfirmedAt is { } sc
                ? DateTime.SpecifyKind(sc, DateTimeKind.Utc) : null,
            FinalizedAt = finalizedAt is { } fz
                ? DateTime.SpecifyKind(fz, DateTimeKind.Utc) : null,
            CreatedAt = DateTime.SpecifyKind(confirmedAt, DateTimeKind.Utc),
        };

        await WithDbAsync(async db =>
        {
            db.Grades.Add(grade);
            await db.SaveChangesAsync();
        });

        return grade;
    }

    /// <summary>Creates a pending/accepted/denied appeal with explicit timestamps.</summary>
    protected async Task<Appeal> SeedAppealAtAsync(
        Guid gradeId,
        DateTime submittedAt,
        AppealStatus status = AppealStatus.Pending,
        DateTime? reviewedAt = null,
        string text = "Please re-evaluate my grade — my answers were correct.")
    {
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(),
            GradeId = gradeId,
            Text = text,
            SubmittedAt = DateTime.SpecifyKind(submittedAt, DateTimeKind.Utc),
            Status = status,
            ReviewedAt = reviewedAt is { } rv ? DateTime.SpecifyKind(rv, DateTimeKind.Utc) : null,
        };

        await WithDbAsync(async db =>
        {
            db.Appeals.Add(appeal);
            await db.SaveChangesAsync();
        });

        return appeal;
    }

    /// <summary>Seeds a denied appeal plus flips the grade's FinalizedAt — like the service would.</summary>
    protected async Task<Appeal> SeedDeniedAppealAtAsync(
        Guid gradeId,
        DateTime submittedAt,
        DateTime reviewedAt,
        string text = "Please re-evaluate my grade — my answers were correct.")
    {
        var appeal = await SeedAppealAtAsync(gradeId, submittedAt, AppealStatus.Denied, reviewedAt, text);
        await WithDbAsync(async db =>
        {
            var grade = await db.Grades.FirstAsync(g => g.Id == gradeId);
            grade.FinalizedAt = DateTime.SpecifyKind(reviewedAt, DateTimeKind.Utc);
            await db.SaveChangesAsync();
        });
        return appeal;
    }
}
