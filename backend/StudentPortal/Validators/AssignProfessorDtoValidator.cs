using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators;

public class AssignProfessorDtoValidator : AbstractValidator<AssignProfessorDto>
{
    public AssignProfessorDtoValidator()
    {
        RuleFor(x => x.GradeId)
            .NotEmpty().WithMessage("GradeId is required.");

        RuleFor(x => x.AssignedProfessorId)
            .NotEmpty().WithMessage("AssignedProfessorId is required.");
    }
}
