using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace StudentPortal.Handlers;

public static class ControllerCallerExtensions
{
    /// <summary>
    /// Reads the caller's user id from the <see cref="ClaimTypes.NameIdentifier"/> claim.
    /// Returns <c>null</c> when the claim is absent or not a GUID, leaving the controller
    /// to decide the response (today: 401 with an empty body).
    /// </summary>
    public static Guid? CallerId(this ControllerBase controller)
    {
        var raw = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
