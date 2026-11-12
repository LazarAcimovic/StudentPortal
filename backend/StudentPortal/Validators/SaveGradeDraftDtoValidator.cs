using FluentValidation;
using StudentPortal.Dtos;

namespace StudentPortal.Validators;

public class SaveGradeDraftDtoValidator : AbstractValidator<SaveGradeDraftDto>
{
    public SaveGradeDraftDtoValidator()
    {
        RuleFor(x => x.Midterm1Points)
            .Must(v => v!.Value >= 0m && v.Value <= 30m).WithMessage("First midterm points must be between 0 and 30.")
            .Must(v => v!.Value * 2 == Math.Floor(v.Value * 2)).WithMessage("First midterm points must be a multiple of 0.5.")
            .When(x => x.Midterm1Points.HasValue);

        RuleFor(x => x.Midterm2Points)
            .Must(v => v!.Value >= 0m && v.Value <= 30m).WithMessage("Second midterm points must be between 0 and 30.")
            .Must(v => v!.Value * 2 == Math.Floor(v.Value * 2)).WithMessage("Second midterm points must be a multiple of 0.5.")
            .When(x => x.Midterm2Points.HasValue);

        RuleFor(x => x.AttendancePoints)
            .Must(v => v!.Value >= 0m && v.Value <= 5m).WithMessage("Attendance points must be between 0 and 5.")
            .Must(v => v!.Value * 2 == Math.Floor(v.Value * 2)).WithMessage("Attendance points must be a multiple of 0.5.")
            .When(x => x.AttendancePoints.HasValue);

        RuleFor(x => x.PracticalPoints)
            .Must(v => v!.Value >= 0m && v.Value <= 5m).WithMessage("Practical participation points must be between 0 and 5.")
            .Must(v => v!.Value * 2 == Math.Floor(v.Value * 2)).WithMessage("Practical participation points must be a multiple of 0.5.")
            .When(x => x.PracticalPoints.HasValue);

        RuleFor(x => x.ExamPoints)
            .Must(v => v!.Value >= 0m && v.Value <= 30m).WithMessage("Exam points must be between 0 and 30.")
            .Must(v => v!.Value * 2 == Math.Floor(v.Value * 2)).WithMessage("Exam points must be a multiple of 0.5.")
            .When(x => x.ExamPoints.HasValue);
    }
}
