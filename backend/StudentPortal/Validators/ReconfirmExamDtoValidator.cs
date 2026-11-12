using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators;

public class ReconfirmExamDtoValidator : AbstractValidator<ReconfirmExamDto>
{
    public ReconfirmExamDtoValidator()
    {
        RuleFor(x => x.EnrollmentId)
            .NotEmpty().WithMessage("EnrollmentId is required.");

        RuleFor(x => x.ExamPoints)
            .InclusiveBetween(0m, 30m).WithMessage("Exam points must be between 0 and 30.")
            .Must(v => v * 2 == Math.Floor(v * 2)).WithMessage("Exam points must be a multiple of 0.5.");
    }
}
