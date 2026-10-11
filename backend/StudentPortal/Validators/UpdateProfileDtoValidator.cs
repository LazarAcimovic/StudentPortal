using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class UpdateProfileDtoValidator : AbstractValidator<UpdateProfileDto>
    {
        public UpdateProfileDtoValidator()
        {
            // All fields are optional (missing = preserve existing value).
            // When present, each field must satisfy its constraints.

            When(x => x.FirstName != null, () =>
            {
                RuleFor(x => x.FirstName)
                    .NotEmpty().WithMessage("First name must not be empty.")
                    .MaximumLength(50).WithMessage("First name must not exceed 50 characters.");
            });

            When(x => x.LastName != null, () =>
            {
                RuleFor(x => x.LastName)
                    .NotEmpty().WithMessage("Last name must not be empty.")
                    .MaximumLength(50).WithMessage("Last name must not exceed 50 characters.");
            });

            When(x => x.Email != null, () =>
            {
                RuleFor(x => x.Email)
                    .NotEmpty().WithMessage("Email must not be empty.")
                    .EmailAddress().WithMessage("Email must be a valid email address.")
                    .MaximumLength(100).WithMessage("Email must not exceed 100 characters.");
            });
        }
    }
}
