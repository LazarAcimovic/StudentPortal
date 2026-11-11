namespace StudentPortal.Configuration;

/// <summary>
/// Single source for the two token lifetimes, bound from the <c>JwtConfig</c> section.
/// Read by <c>TokenService</c> (JWT <c>exp</c>), <c>AuthService</c> (refresh-row expiry) and
/// <c>AccountController</c> (cookie <c>Expires</c>) so the JWT and its <c>sp_access</c> cookie
/// can no longer drift apart (Tech-Backend §4, PRD §6).
/// </summary>
public class TokenLifetimeOptions
{
    public const string SectionName = "JwtConfig";

    /// <summary>Access-token / <c>sp_access</c> lifetime, in minutes (PRD §6: 15).</summary>
    public int TokenValidityMins { get; set; }

    /// <summary>Refresh-token / <c>sp_refresh</c> lifetime, in days (PRD §6: 7).</summary>
    public int RefreshTokenValidityDays { get; set; }
}
