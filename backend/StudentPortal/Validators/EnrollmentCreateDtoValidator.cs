using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class EnrollmentCreateDtoValidator : AbstractValidator<EnrollmentCreateDto>
    {
        public EnrollmentCreateDtoValidator()
        {
            RuleFor(x => x.StudentId)
                .NotEmpty().WithMessage("Student is required.");

            RuleFor(x => x.SubjectId)
                .NotEmpty().WithMessage("Subject is required.");
        }
    }
}
