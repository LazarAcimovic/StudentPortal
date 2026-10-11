using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class AdminUpdateUserDtoValidator : AbstractValidator<AdminUpdateUserDto>
    {
        public AdminUpdateUserDtoValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MaximumLength(50).WithMessage("First name must not exceed 50 characters.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .MaximumLength(50).WithMessage("Last name must not exceed 50 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Email must be a valid email address.")
                .MaximumLength(100).WithMessage("Email must not exceed 100 characters.");

            RuleFor(x => x.UserRole)
                .IsInEnum().WithMessage("User role must be a valid role.");

            RuleFor(x => x.IndexNumber)
                .MaximumLength(20).WithMessage("Index number must not exceed 20 characters.")
                .When(x => !string.IsNullOrEmpty(x.IndexNumber));
        }
    }
}
