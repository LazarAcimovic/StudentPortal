using StudentPortal.Models.Entities;

namespace StudentPortal.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> FindByHashAsync(string tokenHash);
    Task AddAsync(RefreshToken token);
    Task RevokeAsync(Guid id, Guid? replacedByTokenId = null);
    Task RevokeAllForUserAsync(Guid userId);
    Task<IReadOnlyList<RefreshToken>> GetAllForUserAsync(Guid userId);
    Task DeleteRangeAsync(IReadOnlyCollection<Guid> ids);
}
