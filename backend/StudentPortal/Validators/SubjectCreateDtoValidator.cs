using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class SubjectCreateDtoValidator : AbstractValidator<SubjectCreateDto>
    {
        public SubjectCreateDtoValidator()
        {
            RuleFor(x => x.SubjectName)
                .NotEmpty().WithMessage("Subject name is required.")
                .MaximumLength(100).WithMessage("Subject name must not exceed 100 characters.");

            RuleFor(x => x.SubjectCode)
                .NotEmpty().WithMessage("Subject code is required.")
                .MaximumLength(20).WithMessage("Subject code must not exceed 20 characters.");

            RuleFor(x => x.ECTS)
                .InclusiveBetween(1, 30).WithMessage("ECTS must be between 1 and 30.");

            RuleFor(x => x.ProfessorId)
                .NotEmpty().WithMessage("Professor is required.");
        }
    }
}
