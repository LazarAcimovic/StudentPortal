using FluentValidation;
using StudentPortal.Dtos;
using StudentPortal.Models.Enums;

namespace StudentPortal.Validators
{
    public class AdminCreateUserDtoValidator : AbstractValidator<AdminCreateUserDto>
    {
        public AdminCreateUserDtoValidator()
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

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(12).WithMessage("Password must be at least 12 characters.")
                .MaximumLength(128).WithMessage("Password must not exceed 128 characters.")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter.")
                .Matches(@"[0-9]").WithMessage("Password must contain at least one number.")
                .Matches(@"[!@#$%^&*]").WithMessage("Password must contain at least one special character (!@#$%^&*).")
                .Must(p => !p.Contains(' ')).WithMessage("Password must not contain spaces.");

            RuleFor(x => x.UserRole)
                .IsInEnum().WithMessage("User role must be a valid role.");

            RuleFor(x => x.IndexNumber)
                .MaximumLength(20).WithMessage("Index number must not exceed 20 characters.")
                .When(x => !string.IsNullOrEmpty(x.IndexNumber));
        }
    }
}
