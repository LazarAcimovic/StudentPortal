using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests;

public class SmokeTests : IntegrationTestBase
{
    public SmokeTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Fixture_IsFullyWired_AdminCanLoginAndCallMe()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await client.GetAsync("/api/Account/Me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<UserDto>();
        dto.Should().NotBeNull();
        dto!.Email.Should().Be(SeedUsers.Admin.Email);
        dto.UserRole.Should().Be(RoleEnum.Admin);
    }

    [Fact]
    public async Task UnhandledException_Returns500ProblemDetails_WithNoExceptionText()
    {
        // Production environment activates UseExceptionHandler (not the dev exception page).
        // BombController is registered from this test assembly so the route exists.
        var factory = Fixture.Factory.WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Production");
            b.ConfigureServices(s =>
                s.AddControllers().AddApplicationPart(typeof(SmokeTests).Assembly));
        });

        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false,
            BaseAddress = new Uri("http://localhost"),
        });

        var response = await client.GetAsync("/api/__bomb__");

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("secret-bomb-message");
        body.Should().NotContain("InvalidOperationException");
        body.Should().NotContain("StackTrace");
        body.Should().Contain("An error occurred.");
    }
}

[ApiController]
[Route("api/__bomb__")]
public sealed class BombController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() =>
        throw new InvalidOperationException("secret-bomb-message: leaked-db-connection-string");
}
