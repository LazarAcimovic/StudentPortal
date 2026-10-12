using Microsoft.Extensions.Configuration;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class TokenServiceTests
{
    // HS512 requires a signing key of at least 64 bytes (512 bits).
    private const string TestSigningKey = "test-signing-key-must-be-long-enough-for-hs512-xxxxxxxxxxxxxxxxxx";

    private static IConfiguration BuildConfig(int validityMins = 15)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                ["JwtConfig:Key"] = TestSigningKey,
                ["JwtConfig:Issuer"] = "test-issuer",
                ["JwtConfig:Audience"] = "test-audience",
                ["JwtConfig:TokenValidityMins"] = validityMins.ToString(),
            }!)
            .Build();
    }

    private static User MakeUser()
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            UserRole = RoleEnum.Student,
        };
    }

    [Fact]
    public void GenerateAccessToken_ReturnsThreePartCompactJws()
    {
        // A JWS compact serialisation is "header.payload.signature". Verifying the shape confirms
        // the handler ran end-to-end (header + payload + signature all produced).
        var sut = new TokenService(BuildConfig());

        var token = sut.GenerateAccessToken(MakeUser());

        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(3, token.Split('.').Length);
        Assert.All(token.Split('.'), part => Assert.False(string.IsNullOrWhiteSpace(part)));
    }

    [Fact]
    public void GenerateAccessToken_TwoCallsForSameUser_ProduceDistinctTokens()
    {
        // Even for the same user, the per-token jti and the iat/exp timestamps make each JWT unique.
        var sut = new TokenService(BuildConfig());
        var user = MakeUser();

        var a = sut.GenerateAccessToken(user);
        var b = sut.GenerateAccessToken(user);

        Assert.NotEqual(a, b);
    }

    [Fact]
    public void GenerateRefreshTokenRaw_ReturnsNonEmptyBase64StringOfExpectedLength()
    {
        // Implementation emits 64 random bytes → base64. 64 bytes encodes to 88 chars (incl. padding).
        var sut = new TokenService(BuildConfig());

        var raw = sut.GenerateRefreshTokenRaw();

        Assert.False(string.IsNullOrWhiteSpace(raw));
        Assert.Equal(88, raw.Length);
        // Round-trip through base64 to prove it is well-formed.
        var bytes = Convert.FromBase64String(raw);
        Assert.Equal(64, bytes.Length);
    }

    [Fact]
    public void GenerateRefreshTokenRaw_ReturnsDistinctValuesAcrossCalls()
    {
        // Entropy sanity: 1000 draws of a 512-bit RNG must not collide.
        var sut = new TokenService(BuildConfig());

        var samples = Enumerable.Range(0, 1000).Select(_ => sut.GenerateRefreshTokenRaw()).ToHashSet();

        Assert.Equal(1000, samples.Count);
    }

    [Fact]
    public void HashRefreshToken_IsDeterministicForTheSameInput()
    {
        // The RefreshAsync flow depends on this: a presented raw token hashed twice must match the
        // stored hash the first login persisted.
        var sut = new TokenService(BuildConfig());

        Assert.Equal(sut.HashRefreshToken("same-raw-token"), sut.HashRefreshToken("same-raw-token"));
    }

    [Fact]
    public void HashRefreshToken_DistinctInputsProduceDistinctHashes()
    {
        var sut = new TokenService(BuildConfig());

        Assert.NotEqual(sut.HashRefreshToken("raw-1"), sut.HashRefreshToken("raw-2"));
    }

    [Fact]
    public void HashRefreshToken_EmitsBase64EncodedSha256()
    {
        // 256-bit digest → 32 bytes → 44 base64 chars (with padding).
        var sut = new TokenService(BuildConfig());

        var hash = sut.HashRefreshToken("anything");

        Assert.Equal(44, hash.Length);
        Assert.Equal(32, Convert.FromBase64String(hash).Length);
    }
}
