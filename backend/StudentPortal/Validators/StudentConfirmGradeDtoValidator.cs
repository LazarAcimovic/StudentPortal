using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators;

public class StudentConfirmGradeDtoValidator : AbstractValidator<StudentConfirmGradeDto>
{
    public StudentConfirmGradeDtoValidator()
    {
        RuleFor(x => x.EnrollmentId)
            .NotEmpty().WithMessage("EnrollmentId is required.");
    }
}
