using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly StudentPortalApiContext _context;

    public RefreshTokenRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<RefreshToken?> FindByHashAsync(string tokenHash)
        => await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

    public async Task AddAsync(RefreshToken token)
    {
        await _context.RefreshTokens.AddAsync(token);
        await _context.SaveChangesAsync();
    }

    public async Task RevokeAsync(Guid id, Guid? replacedByTokenId = null)
    {
        var token = await _context.RefreshTokens.FindAsync(id);
        if (token is null) return;

        token.RevokedUtc = DateTime.UtcNow;
        token.ReplacedByTokenId = replacedByTokenId;
        await _context.SaveChangesAsync();
    }

    public async Task RevokeAllForUserAsync(Guid userId)
    {
        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedUtc == null)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var token in tokens)
            token.RevokedUtc = now;

        await _context.SaveChangesAsync();
    }
}
