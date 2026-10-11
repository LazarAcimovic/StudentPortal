using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class ChangePasswordDtoValidator : AbstractValidator<ChangePasswordDto>
    {
        public ChangePasswordDtoValidator()
        {
            RuleFor(x => x.CurrentPassword)
                .NotEmpty().WithMessage("Current password is required.");

            RuleFor(x => x.NewPassword)
                .NotEmpty().WithMessage("New password is required.")
                .MinimumLength(12).WithMessage("New password must be at least 12 characters.")
                .MaximumLength(128).WithMessage("New password must not exceed 128 characters.")
                .Matches(@"[A-Z]").WithMessage("New password must contain at least one uppercase letter.")
                .Matches(@"[a-z]").WithMessage("New password must contain at least one lowercase letter.")
                .Matches(@"[0-9]").WithMessage("New password must contain at least one number.")
                .Matches(@"[!@#$%^&*]").WithMessage("New password must contain at least one special character (!@#$%^&*).")
                .Must(p => !p.Contains(' ')).WithMessage("New password must not contain spaces.")
                .NotEqual(x => x.CurrentPassword).WithMessage("New password must be different from the current password.");
        }
    }
}
