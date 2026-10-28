using Microsoft.AspNetCore.Hosting;
using Npgsql;
using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.TestMode;

/// <summary>
/// Task 22d.2 — the /api/__test__/* control surface and its four-layer production safety guard.
/// These do NOT use <see cref="IntegrationTestBase"/>: the base factory runs the Development
/// environment with the system-clock swap, whereas test mode only activates under the e2e
/// environment. Each test spins up its own <see cref="WebApplicationFactory{Program}"/> against
/// the shared container so it can vary the environment and the TestMode configuration.
/// </summary>
[Collection("Integration")]
public class TestModeEndpointsTests
{
    private const string Secret = "e2e-integration-secret";

    private readonly IntegrationTestFixture _fixture;
    private readonly string _testDbName;

    public TestModeEndpointsTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
        _testDbName = new NpgsqlConnectionStringBuilder(_fixture.ConnectionString).Database;
    }

    // ─── Happy path: all four guard layers satisfied ──────────────────────────

    [Fact]
    public async Task AdvanceClock_WithValidSecret_MovesTheClockForwardByTheGivenSeconds()
    {
        using var factory = CreateFactory(environment: "e2e");
        var client = CreateClient(factory, withSecret: true);

        var before = await PostAdvanceAndReadNow(client, seconds: 0);
        var after = await PostAdvanceAndReadNow(client, seconds: 3600);

        (after - before).Should().BeCloseTo(TimeSpan.FromHours(1), TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task Reset_WithValidSecret_Succeeds_AndReplaysTheSeed()
    {
        using var factory = CreateFactory(environment: "e2e");
        var client = CreateClient(factory, withSecret: true);

        var reset = await client.PostAsync("/api/__test__/reset", content: null);
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // The seed is back: the admin from seed.sql can authenticate through the real pipeline.
        var login = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = SeedUsers.Password });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ─── Layer 4: the per-build secret header ──────────────────────────────────

    [Fact]
    public async Task TestEndpoints_WithoutTheSecretHeader_Return404()
    {
        using var factory = CreateFactory(environment: "e2e");
        var client = CreateClient(factory, withSecret: false);

        var response = await client.PostAsync("/api/__test__/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task TestEndpoints_WithAWrongSecretHeader_Return404()
    {
        using var factory = CreateFactory(environment: "e2e");
        var client = CreateClient(factory, withSecret: true, secretOverride: "not-the-secret");

        var response = await client.PostAsync("/api/__test__/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ─── Layers 1–3: environment, feature flag, test-database name ─────────────

    [Fact]
    public async Task TestEndpoints_UnderProduction_AreNotMounted_Return404()
    {
        using var factory = CreateFactory(environment: "Production");
        var client = CreateClient(factory, withSecret: true);

        var response = await client.PostAsync("/api/__test__/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task TestEndpoints_WhenFeatureFlagOff_AreNotMounted_Return404()
    {
        using var factory = CreateFactory(environment: "e2e", enabled: false);
        var client = CreateClient(factory, withSecret: true);

        var response = await client.PostAsync("/api/__test__/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task TestEndpoints_WhenConnectionStringIsNotTheTestDatabase_AreNotMounted_Return404()
    {
        using var factory = CreateFactory(environment: "e2e", databaseNameOverride: "some_other_database");
        var client = CreateClient(factory, withSecret: true);

        var response = await client.PostAsync("/api/__test__/reset", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private WebApplicationFactory<Program> CreateFactory(
        string environment,
        bool enabled = true,
        string databaseNameOverride = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("ConnectionStrings:DefaultConnection", _fixture.ConnectionString);
            builder.UseSetting("JwtConfig:Key",
                "integration-test-signing-key-with-at-least-sixty-four-bytes-of-entropy-xxxxxxxx");
            builder.UseSetting("JwtConfig:Issuer", "https://integration-tests/");
            builder.UseSetting("JwtConfig:Audience", "https://integration-tests");
            builder.UseSetting("JwtConfig:TokenValidityMins", "15");
            builder.UseSetting("Cors:Origins:0", "http://localhost");
            builder.UseSetting("TestMode:Enabled", enabled ? "true" : "false");
            builder.UseSetting("TestMode:DatabaseName", databaseNameOverride ?? _testDbName);
            builder.UseSetting("TestMode:Secret", Secret);
        });
    }

    private static HttpClient CreateClient(
        WebApplicationFactory<Program> factory, bool withSecret, string secretOverride = null)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost"),
        });
        if (withSecret)
            client.DefaultRequestHeaders.Add("X-Test-Secret", secretOverride ?? Secret);
        return client;
    }

    private static async Task<DateTimeOffset> PostAdvanceAndReadNow(HttpClient client, int seconds)
    {
        var response = await client.PostAsync($"/api/__test__/advance-clock?seconds={seconds}", content: null);
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            $"advance-clock must succeed (got {response.StatusCode}: {await response.Content.ReadAsStringAsync()})");

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("now").GetDateTimeOffset();
    }
}
