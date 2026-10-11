using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class SubjectUpdateDtoValidator : AbstractValidator<SubjectUpdateDto>
    {
        public SubjectUpdateDtoValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("Subject ID is required.");

            RuleFor(x => x.SubjectName)
                .NotEmpty().WithMessage("Subject name is required.")
                .MaximumLength(100).WithMessage("Subject name must not exceed 100 characters.");

            RuleFor(x => x.ECTS)
                .InclusiveBetween(1, 30).WithMessage("ECTS must be between 1 and 30.");

            RuleFor(x => x.ProfessorId)
                .NotEmpty().WithMessage("Professor is required.");
        }
    }
}
