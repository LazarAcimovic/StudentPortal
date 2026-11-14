using Microsoft.AspNetCore.Hosting;
using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Demo;

/// <summary>
/// The <c>/api/Demo/*</c> surface and its single production guard (per D-049, PRD §7.1).
///
/// These do NOT derive from <see cref="IntegrationTestBase"/>: the shared fixture factory never
/// enables demo mode, and each test here needs to vary <c>DemoMode:Enabled</c>. Each spins up
/// its own <see cref="WebApplicationFactory{Program}"/> against the shared container, the same
/// shape <c>TestModeEndpointsTests</c> uses.
///
/// A demo reset layers the two dev fixtures onto the database (30 active students instead of
/// 10), which other suites assert against — so <see cref="DisposeAsync"/> puts the shared
/// container back to a plain <c>seed.sql</c> state after every test here.
/// </summary>
[Collection("Integration")]
public class DemoEndpointsTests : IAsyncLifetime
{
    private readonly IntegrationTestFixture _fixture;

    public DemoEndpointsTests(IntegrationTestFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAndSeedAsync();

    public Task DisposeAsync() => _fixture.ResetAndSeedAsync();

    // ─── The flag is on: the surface exists and works ──────────────────────────

    [Fact]
    public async Task Status_WhenDemoModeEnabled_Returns200()
    {
        using var factory = CreateFactory(demoMode: true);
        var client = CreateClient(factory);

        var response = await client.GetAsync("/api/Demo/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Reset_WhenDemoModeEnabled_ReplaysAllThreeFixtures()
    {
        using var factory = CreateFactory(demoMode: true);
        var client = CreateClient(factory);

        var reset = await client.PostAsync("/api/Demo/reset", content: null);
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // seed.sql — the auth cast is back and authenticates through the real pipeline.
        var login = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = SeedUsers.Password });
        login.StatusCode.Should().Be(HttpStatusCode.OK);

        await using var db = _fixture.CreateDbContext();

        // All three fixtures contribute students: seed.sql's 10 active ones, plus the 5 that
        // seed-dev-escalations.sql brings for its demo cases, plus seed-dev-pagination.sql's 20.
        var activeStudents = await db.Users
            .CountAsync(u => !u.IsDeleted && u.UserRole == RoleEnum.Student);
        activeStudents.Should().Be(35,
            "a demo reset layers all three fixtures: 10 from seed.sql + 5 from " +
            "seed-dev-escalations.sql + 20 from seed-dev-pagination.sql");

        // seed-dev-escalations.sql — without it the admin Escalations tab is empty.
        var escalations = await db.Escalations.CountAsync();
        escalations.Should().BeGreaterThan(0,
            "seed-dev-escalations.sql must have layered its demo cases on top of seed.sql");
    }

    [Fact]
    public async Task Reset_RequiresNoAuthentication()
    {
        using var factory = CreateFactory(demoMode: true);
        var client = CreateClient(factory);

        // No login, no cookie: the button is for anyone evaluating the demo (per D-049).
        var response = await client.PostAsync("/api/Demo/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ─── The gate: concurrent clicks must not collide ──────────────────────────

    [Fact]
    public async Task Reset_UnderConcurrentClicks_NeverFails_AndAtLeastOneRuns()
    {
        using var factory = CreateFactory(demoMode: true);
        var client = CreateClient(factory);

        // Without DemoResetService's semaphore the losers' INSERTs collide with the winner's
        // committed rows on the fixtures' fixed GUIDs and surface as 500 duplicate-key errors.
        var responses = await Task.WhenAll(
            Enumerable.Range(0, 5).Select(_ => client.PostAsync("/api/Demo/reset", content: null)));

        responses.Should().OnlyContain(
            r => r.StatusCode == HttpStatusCode.NoContent || r.StatusCode == HttpStatusCode.Conflict,
            "every concurrent click is either the one that ran (204) or a rejected duplicate (409)");
        responses.Should().Contain(r => r.StatusCode == HttpStatusCode.NoContent,
            "at least one of the clicks must actually have reset the data");

        // Whoever won, the database is coherent afterwards — all three fixtures applied
        // exactly once, not partially and not twice (10 + 5 + 20, see the test above).
        await using var db = _fixture.CreateDbContext();
        var activeStudents = await db.Users
            .CountAsync(u => !u.IsDeleted && u.UserRole == RoleEnum.Student);
        activeStudents.Should().Be(35);
    }

    // ─── The flag is off: the surface does not exist ───────────────────────────

    [Fact]
    public async Task Reset_WhenDemoModeDisabled_IsNotMounted_Returns404()
    {
        using var factory = CreateFactory(demoMode: false);
        var client = CreateClient(factory);

        var response = await client.PostAsync("/api/Demo/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Status_WhenDemoModeDisabled_IsNotMounted_Returns404()
    {
        using var factory = CreateFactory(demoMode: false);
        var client = CreateClient(factory);

        // The SPA reads this 404 as "not a demo deployment" and hides the navbar button.
        var response = await client.GetAsync("/api/Demo/status");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DemoMode_DoesNotMountTheTestModeSurface()
    {
        using var factory = CreateFactory(demoMode: true);
        var client = CreateClient(factory);

        // Demo mode must not unlock clock control: /api/__test__/* keeps its own four layers.
        var response = await client.PostAsync("/api/__test__/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private WebApplicationFactory<Program> CreateFactory(bool demoMode)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ConnectionStrings:DefaultConnection", _fixture.ConnectionString);
            builder.UseSetting("JwtConfig:Key",
                "integration-test-signing-key-with-at-least-sixty-four-bytes-of-entropy-xxxxxxxx");
            builder.UseSetting("JwtConfig:Issuer", "https://integration-tests/");
            builder.UseSetting("JwtConfig:Audience", "https://integration-tests");
            builder.UseSetting("JwtConfig:TokenValidityMins", "15");
            builder.UseSetting("JwtConfig:RefreshTokenValidityDays", "7");
            builder.UseSetting("Cors:Origins:0", "http://localhost");
            builder.UseSetting("DemoMode:Enabled", demoMode ? "true" : "false");
        });
    }

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost"),
        });
}
