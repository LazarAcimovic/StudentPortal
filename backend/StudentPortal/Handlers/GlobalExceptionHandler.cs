using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using StudentPortal.Exceptions;

namespace StudentPortal.Handlers;

internal sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var statusCode = exception switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            ForbiddenAccessException => StatusCodes.Status403Forbidden,
            ValidationException => StatusCodes.Status400BadRequest,
            ConflictException => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var traceId = System.Diagnostics.Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogError(exception, "Unhandled exception. TraceId: {TraceId}", traceId);

        var problem = new ProblemDetails
        {
            Title = "An error occurred.",
            Status = statusCode,
        };
        problem.Extensions["traceId"] = traceId;

        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
