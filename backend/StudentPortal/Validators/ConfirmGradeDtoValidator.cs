using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators
{
    public class ConfirmGradeDtoValidator : AbstractValidator<ConfirmGradeDto>
    {
        public ConfirmGradeDtoValidator()
        {
            RuleFor(x => x.EnrollmentId)
                .NotEmpty().WithMessage("EnrollmentId is required.");

            RuleFor(x => x.Midterm1Points)
                .InclusiveBetween(0, 30).WithMessage("First midterm points must be between 0 and 30.")
                .Must(v => v * 2 == Math.Floor(v * 2)).WithMessage("First midterm points must be a multiple of 0.5.");

            RuleFor(x => x.Midterm2Points)
                .InclusiveBetween(0, 30).WithMessage("Second midterm points must be between 0 and 30.")
                .Must(v => v * 2 == Math.Floor(v * 2)).WithMessage("Second midterm points must be a multiple of 0.5.");

            RuleFor(x => x.AttendancePoints)
                .InclusiveBetween(0, 5).WithMessage("Attendance points must be between 0 and 5.")
                .Must(v => v * 2 == Math.Floor(v * 2)).WithMessage("Attendance points must be a multiple of 0.5.");

            RuleFor(x => x.PracticalPoints)
                .InclusiveBetween(0, 5).WithMessage("Practical participation points must be between 0 and 5.")
                .Must(v => v * 2 == Math.Floor(v * 2)).WithMessage("Practical participation points must be a multiple of 0.5.");

            RuleFor(x => x.ExamPoints)
                .InclusiveBetween(0, 30).WithMessage("Exam points must be between 0 and 30.")
                .Must(v => v * 2 == Math.Floor(v * 2)).WithMessage("Exam points must be a multiple of 0.5.");
        }
    }
}
