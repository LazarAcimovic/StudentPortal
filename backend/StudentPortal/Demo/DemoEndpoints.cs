namespace StudentPortal.Demo;

/// <summary>
/// The <c>/api/Demo/*</c> surface behind the portfolio deployment's "Reset demo" button.
///
/// Mapped ONLY when <c>DemoMode:Enabled</c> is true (see Program.cs). On every other
/// deployment the routes do not exist and answer <c>404</c> — which is also how the SPA decides
/// whether to render the button at all: it probes <c>GET /api/Demo/status</c> once on mount and
/// stays hidden on anything other than a 200.
///
/// <para><b>Deliberately anonymous</b> (per D-049). The button is for anyone evaluating the
/// demo, signed in or not. Its blast radius is "replay the demo fixtures", which is the entire
/// purpose of that deployment, and <see cref="DemoResetService"/>'s gate caps a flood at one
/// real reset at a time — every extra concurrent request costs a rejected semaphore wait, not a
/// database round trip.</para>
///
/// This is a separate surface from <c>/api/__test__/*</c>: that one unlocks clock manipulation
/// for the e2e suite and keeps its four guard layers, including a secret header. Demo mode
/// cannot reach it and does not weaken it.
/// </summary>
public static class DemoEndpoints
{
    public static void MapDemoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/Demo").AllowAnonymous();

        // Existence IS the answer: a 404 from here tells the SPA this is not a demo deployment,
        // so the navbar button needs no build-time flag and cannot disagree with the backend.
        group.MapGet("/status", () => Results.Ok(new { enabled = true }));

        group.MapPost("/reset", async (DemoResetService reset, CancellationToken ct) =>
        {
            var ran = await reset.TryResetAsync(ct);
            return ran
                ? Results.NoContent()
                : Results.Conflict(new { message = "A demo reset is already running" });
        });
    }
}
