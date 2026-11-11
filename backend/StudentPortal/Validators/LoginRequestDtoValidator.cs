using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class LoginRequestDtoValidator : AbstractValidator<LoginRequestDto>
    {
        public LoginRequestDtoValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Email must be a valid email address.")
                .MaximumLength(100).WithMessage("Email must not exceed 100 characters.");

            // Bound the password on login (Tech-Backend §5). A login must NOT enforce the
            // complexity rules — that would reveal which candidate passwords are even possible.
            // The 128 cap removes the PBKDF2 amplification surface on an [AllowAnonymous] endpoint.
            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MaximumLength(128).WithMessage("Password must not exceed 128 characters.");
        }
    }
}
