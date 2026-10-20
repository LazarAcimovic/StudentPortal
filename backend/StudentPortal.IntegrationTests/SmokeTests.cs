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
}
