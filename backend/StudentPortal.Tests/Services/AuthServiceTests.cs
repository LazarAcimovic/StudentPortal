using StudentPortal.Dtos;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class AuthServiceTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly ITokenService _tokens = Substitute.For<ITokenService>();
    private readonly IRefreshTokenRepository _refreshRepo = Substitute.For<IRefreshTokenRepository>();

    private AuthService CreateSut() => new(_users, _tokens, _refreshRepo);

    private static User MakeUser(string plainPassword = "Password123!", bool isDeleted = false)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = "jane@example.com",
            FirstName = "Jane",
            LastName = "Doe",
            IndexNumber = "2020/0001",
            UserRole = RoleEnum.Student,
            IsDeleted = isDeleted,
            UserPassword = PasswordHashHandler.HashPassword(plainPassword),
        };
    }

    private void StubTokenGeneration(string accessToken = "access.jwt", string rawRefresh = "raw-refresh", string hash = "hash-of-raw")
    {
        _tokens.GenerateAccessToken(Arg.Any<User>()).Returns(accessToken);
        _tokens.GenerateRefreshTokenRaw().Returns(rawRefresh);
        _tokens.HashRefreshToken(rawRefresh).Returns(hash);
    }

    // ---------- AuthenticateAsync ----------

    [Fact]
    public async Task AuthenticateAsync_ValidCredentials_ReturnsAuthResultAndPersistsRefreshToken()
    {
        var user = MakeUser("Password123!");
        _users.FindByEmailAsync("jane@example.com").Returns(user);
        StubTokenGeneration();

        var sut = CreateSut();

        var result = await sut.AuthenticateAsync(
            new LoginRequestDto { Email = "jane@example.com", Password = "Password123!" },
            ipAddress: "203.0.113.9");

        Assert.NotNull(result);
        Assert.Same(user, result!.User);
        Assert.Equal("access.jwt", result.AccessToken);
        Assert.Equal("raw-refresh", result.RawRefreshToken);

        await _refreshRepo.Received(1).AddAsync(Arg.Is<RefreshToken>(t =>
            t.UserId == user.Id &&
            t.TokenHash == "hash-of-raw" &&
            t.CreatedByIp == "203.0.113.9"));
    }

    [Fact]
    public async Task AuthenticateAsync_UnknownEmail_ReturnsNullAndDoesNotIssueTokens()
    {
        _users.FindByEmailAsync("ghost@example.com").Returns((User)null);
        var sut = CreateSut();

        var result = await sut.AuthenticateAsync(
            new LoginRequestDto { Email = "ghost@example.com", Password = "Password123!" });

        Assert.Null(result);
        _tokens.DidNotReceiveWithAnyArgs().GenerateAccessToken(default);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task AuthenticateAsync_SoftDeletedUser_ReturnsNull()
    {
        var user = MakeUser("Password123!", isDeleted: true);
        _users.FindByEmailAsync(user.Email).Returns(user);
        var sut = CreateSut();

        var result = await sut.AuthenticateAsync(
            new LoginRequestDto { Email = user.Email, Password = "Password123!" });

        Assert.Null(result);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task AuthenticateAsync_WrongPassword_ReturnsNull()
    {
        var user = MakeUser("Password123!");
        _users.FindByEmailAsync(user.Email).Returns(user);
        var sut = CreateSut();

        var result = await sut.AuthenticateAsync(
            new LoginRequestDto { Email = user.Email, Password = "WrongPassword" });

        Assert.Null(result);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Theory]
    [InlineData(null, "Password123!")]
    [InlineData("", "Password123!")]
    [InlineData("  ", "Password123!")]
    [InlineData("jane@example.com", null)]
    [InlineData("jane@example.com", "")]
    [InlineData("jane@example.com", "   ")]
    public async Task AuthenticateAsync_EmptyOrWhitespaceCredentials_ReturnsNullWithoutLookup(string email, string password)
    {
        var sut = CreateSut();

        var result = await sut.AuthenticateAsync(new LoginRequestDto { Email = email, Password = password });

        Assert.Null(result);
        await _users.DidNotReceiveWithAnyArgs().FindByEmailAsync(default);
    }

    [Fact]
    public async Task AuthenticateAsync_ValidCredentials_PersistsSevenDayRefreshTokenExpiry()
    {
        var user = MakeUser();
        _users.FindByEmailAsync(user.Email).Returns(user);
        StubTokenGeneration();
        var sut = CreateSut();

        var before = DateTime.UtcNow;
        await sut.AuthenticateAsync(new LoginRequestDto { Email = user.Email, Password = "Password123!" });
        var after = DateTime.UtcNow;

        await _refreshRepo.Received(1).AddAsync(Arg.Is<RefreshToken>(t =>
            t.ExpiresUtc >= before.AddDays(7) &&
            t.ExpiresUtc <= after.AddDays(7)));
    }

    // ---------- RefreshAsync ----------

    [Fact]
    public async Task RefreshAsync_ValidToken_RotatesAndReturnsNewPair()
    {
        var user = MakeUser();
        var oldTokenId = Guid.NewGuid();
        var stored = new RefreshToken
        {
            Id = oldTokenId,
            UserId = user.Id,
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddDays(3),
            RevokedUtc = null,
            CreatedUtc = DateTime.UtcNow.AddDays(-4),
        };

        _tokens.HashRefreshToken("raw-presented").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);
        _users.GetUserByIdAsync(user.Id).Returns(user);
        _tokens.GenerateAccessToken(user).Returns("new.access.jwt");
        _tokens.GenerateRefreshTokenRaw().Returns("new-raw");
        _tokens.HashRefreshToken("new-raw").Returns("new-hash");

        var sut = CreateSut();

        var result = await sut.RefreshAsync("raw-presented", ipAddress: "198.51.100.4");

        Assert.NotNull(result);
        Assert.Equal("new.access.jwt", result!.AccessToken);
        Assert.Equal("new-raw", result.RawRefreshToken);
        Assert.Same(user, result.User);

        await _refreshRepo.Received(1).RevokeAsync(oldTokenId, Arg.Any<Guid>());
        await _refreshRepo.Received(1).AddAsync(Arg.Is<RefreshToken>(t =>
            t.UserId == user.Id &&
            t.TokenHash == "new-hash" &&
            t.CreatedByIp == "198.51.100.4"));
    }

    [Fact]
    public async Task RefreshAsync_ValidToken_NewTokenIdMatchesReplacedByIdOfOldRow()
    {
        var user = MakeUser();
        var oldId = Guid.NewGuid();
        var stored = new RefreshToken
        {
            Id = oldId,
            UserId = user.Id,
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddDays(3),
        };
        _tokens.HashRefreshToken("raw").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);
        _users.GetUserByIdAsync(user.Id).Returns(user);
        _tokens.GenerateRefreshTokenRaw().Returns("new-raw");
        _tokens.HashRefreshToken("new-raw").Returns("new-hash");

        Guid? capturedReplacedBy = null;
        Guid? capturedNewId = null;
        await _refreshRepo.RevokeAsync(oldId, Arg.Do<Guid?>(g => capturedReplacedBy = g));
        _refreshRepo.AddAsync(Arg.Do<RefreshToken>(t => capturedNewId = t.Id)).Returns(Task.CompletedTask);

        var sut = CreateSut();

        await sut.RefreshAsync("raw");

        Assert.NotNull(capturedReplacedBy);
        Assert.NotNull(capturedNewId);
        Assert.Equal(capturedNewId, capturedReplacedBy);
    }

    [Fact]
    public async Task RefreshAsync_UnknownToken_ReturnsNull()
    {
        _tokens.HashRefreshToken("stranger").Returns("no-match");
        _refreshRepo.FindByHashAsync("no-match").Returns((RefreshToken)null);
        var sut = CreateSut();

        var result = await sut.RefreshAsync("stranger");

        Assert.Null(result);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
        await _refreshRepo.DidNotReceiveWithAnyArgs().RevokeAsync(default, default);
        await _refreshRepo.DidNotReceiveWithAnyArgs().RevokeAllForUserAsync(default);
    }

    [Fact]
    public async Task RefreshAsync_AlreadyRotatedToken_RevokesEntireFamilyAndReturnsNull()
    {
        // §6 security: "detects re-use (if a previously-rotated refresh token is presented,
        // revoke the entire chain for that user)."
        var user = MakeUser();
        var stored = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddDays(3),
            RevokedUtc = DateTime.UtcNow.AddHours(-1),
            ReplacedByTokenId = Guid.NewGuid(),
        };
        _tokens.HashRefreshToken("raw-reused").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);

        var sut = CreateSut();

        var result = await sut.RefreshAsync("raw-reused");

        Assert.Null(result);
        await _refreshRepo.Received(1).RevokeAllForUserAsync(user.Id);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task RefreshAsync_ExpiredToken_ReturnsNullAndDoesNotRotate()
    {
        var user = MakeUser();
        var stored = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddSeconds(-1),
            RevokedUtc = null,
        };
        _tokens.HashRefreshToken("raw-expired").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);

        var sut = CreateSut();

        var result = await sut.RefreshAsync("raw-expired");

        Assert.Null(result);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
        await _refreshRepo.DidNotReceiveWithAnyArgs().RevokeAsync(default, default);
        await _refreshRepo.DidNotReceiveWithAnyArgs().RevokeAllForUserAsync(default);
    }

    [Fact]
    public async Task RefreshAsync_UserHasBeenSoftDeleted_ReturnsNull()
    {
        var user = MakeUser(isDeleted: true);
        var stored = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddDays(1),
        };
        _tokens.HashRefreshToken("raw").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);
        _users.GetUserByIdAsync(user.Id).Returns(user);

        var sut = CreateSut();

        var result = await sut.RefreshAsync("raw");

        Assert.Null(result);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task RefreshAsync_UserNotFound_ReturnsNull()
    {
        var stored = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddDays(1),
        };
        _tokens.HashRefreshToken("raw").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);
        _users.GetUserByIdAsync(stored.UserId).Returns((User)null);

        var sut = CreateSut();

        var result = await sut.RefreshAsync("raw");

        Assert.Null(result);
        await _refreshRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task RefreshAsync_RotatedTokenCarriesSevenDayExpiryAndCurrentIp()
    {
        var user = MakeUser();
        var stored = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "stored-hash",
            ExpiresUtc = DateTime.UtcNow.AddDays(3),
        };
        _tokens.HashRefreshToken("raw").Returns("stored-hash");
        _refreshRepo.FindByHashAsync("stored-hash").Returns(stored);
        _users.GetUserByIdAsync(user.Id).Returns(user);
        _tokens.GenerateRefreshTokenRaw().Returns("new-raw");
        _tokens.HashRefreshToken("new-raw").Returns("new-hash");

        var sut = CreateSut();

        var before = DateTime.UtcNow;
        await sut.RefreshAsync("raw", ipAddress: "10.0.0.1");
        var after = DateTime.UtcNow;

        await _refreshRepo.Received(1).AddAsync(Arg.Is<RefreshToken>(t =>
            t.CreatedByIp == "10.0.0.1" &&
            t.ExpiresUtc >= before.AddDays(7) &&
            t.ExpiresUtc <= after.AddDays(7)));
    }
}
