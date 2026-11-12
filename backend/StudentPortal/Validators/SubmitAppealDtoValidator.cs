using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators;

public class SubmitAppealDtoValidator : AbstractValidator<SubmitAppealDto>
{
    public SubmitAppealDtoValidator()
    {
        RuleFor(x => x.EnrollmentId)
            .NotEmpty().WithMessage("EnrollmentId is required.");

        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Appeal text is required.")
            .Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("Appeal text must not be whitespace only.")
            .MaximumLength(1000).WithMessage("Appeal text must not exceed 1000 characters.");
    }
}
