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

    /// <summary>
    /// Grace period, in days, before a revoked-and-expired refresh row is pruned on the
    /// write path (D-041). Defaults to 30 when the config key is absent.
    /// </summary>
    public int RevokedTokenRetentionDays { get; set; } = 30;

    /// <summary>
    /// Maximum live (unrevoked, unexpired) refresh rows per user; the oldest beyond this
    /// are revoked on the write path (D-041). Defaults to 10 when the config key is absent.
    /// </summary>
    public int MaxLiveTokensPerUser { get; set; } = 10;
}
