using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators;

public class ReassignProfessorDtoValidator : AbstractValidator<ReassignProfessorDto>
{
    public ReassignProfessorDtoValidator()
    {
        RuleFor(x => x.GradeId)
            .NotEmpty().WithMessage("GradeId is required.");

        RuleFor(x => x.NewProfessorId)
            .NotEmpty().WithMessage("NewProfessorId is required.");
    }
}
