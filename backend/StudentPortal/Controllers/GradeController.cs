using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentPortal.Interfaces;

namespace StudentPortal.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GradeController : ControllerBase
{
    private readonly IGradeService _gradeService;

    public GradeController(IGradeService gradeService)
    {
        _gradeService = gradeService;
    }
}
