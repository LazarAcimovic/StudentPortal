namespace StudentPortal.Models.Entities;

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; }
    public DateTime ExpiresUtc { get; set; }
    public DateTime? RevokedUtc { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
    public DateTime CreatedUtc { get; set; }
    public string? CreatedByIp { get; set; }

    public virtual User User { get; set; }
}
