using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using StudentPortal.Models.Enums;
using StudentPortal.Models.Entities;

namespace StudentPortal.Models.Entities;

public partial class StudentPortalApiContext : DbContext
{
    public StudentPortalApiContext()
    {
    }

    public StudentPortalApiContext(DbContextOptions<StudentPortalApiContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Enrollment> Enrollments { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<GradeDraft> GradeDrafts { get; set; }

    public virtual DbSet<Appeal> Appeals { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.StudentId, e.SubjectId }).IsUnique();

            entity.Property(e => e.EnrolledAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Student).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Subject).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.EnrollmentId).IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.Midterm1Points).HasColumnType("numeric(4,1)");
            entity.Property(e => e.Midterm2Points).HasColumnType("numeric(4,1)");
            entity.Property(e => e.AttendancePoints).HasColumnType("numeric(3,1)");
            entity.Property(e => e.PracticalPoints).HasColumnType("numeric(3,1)");
            entity.Property(e => e.ExamPoints).HasColumnType("numeric(4,1)");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Grades_FinalGrade_Range", "\"FinalGrade\" BETWEEN 5 AND 10");
                t.HasCheckConstraint("CK_Grades_Midterm1_Range", "\"Midterm1Points\" BETWEEN 0 AND 30");
                t.HasCheckConstraint("CK_Grades_Midterm2_Range", "\"Midterm2Points\" BETWEEN 0 AND 30");
                t.HasCheckConstraint("CK_Grades_Attendance_Range", "\"AttendancePoints\" BETWEEN 0 AND 5");
                t.HasCheckConstraint("CK_Grades_Practical_Range", "\"PracticalPoints\" BETWEEN 0 AND 5");
                t.HasCheckConstraint("CK_Grades_Exam_Range", "\"ExamPoints\" BETWEEN 0 AND 30");
                t.HasCheckConstraint("CK_Grades_Half_Step",
                    "\"Midterm1Points\" * 2 = FLOOR(\"Midterm1Points\" * 2) " +
                    "AND \"Midterm2Points\" * 2 = FLOOR(\"Midterm2Points\" * 2) " +
                    "AND \"AttendancePoints\" * 2 = FLOOR(\"AttendancePoints\" * 2) " +
                    "AND \"PracticalPoints\" * 2 = FLOOR(\"PracticalPoints\" * 2) " +
                    "AND \"ExamPoints\" * 2 = FLOOR(\"ExamPoints\" * 2)");
            });

            entity.HasOne(d => d.Enrollment).WithOne(p => p.Grade)
                .HasForeignKey<Grade>(d => d.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GradeDraft>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.EnrollmentId).IsUnique();

            entity.Property(e => e.LastEditedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.Midterm1Points).HasColumnType("numeric(4,1)");
            entity.Property(e => e.Midterm2Points).HasColumnType("numeric(4,1)");
            entity.Property(e => e.AttendancePoints).HasColumnType("numeric(3,1)");
            entity.Property(e => e.PracticalPoints).HasColumnType("numeric(3,1)");
            entity.Property(e => e.ExamPoints).HasColumnType("numeric(4,1)");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_GradeDrafts_Midterm1_Range",
                    "\"Midterm1Points\" IS NULL OR \"Midterm1Points\" BETWEEN 0 AND 30");
                t.HasCheckConstraint("CK_GradeDrafts_Midterm2_Range",
                    "\"Midterm2Points\" IS NULL OR \"Midterm2Points\" BETWEEN 0 AND 30");
                t.HasCheckConstraint("CK_GradeDrafts_Attendance_Range",
                    "\"AttendancePoints\" IS NULL OR \"AttendancePoints\" BETWEEN 0 AND 5");
                t.HasCheckConstraint("CK_GradeDrafts_Practical_Range",
                    "\"PracticalPoints\" IS NULL OR \"PracticalPoints\" BETWEEN 0 AND 5");
                t.HasCheckConstraint("CK_GradeDrafts_Exam_Range",
                    "\"ExamPoints\" IS NULL OR \"ExamPoints\" BETWEEN 0 AND 30");
                t.HasCheckConstraint("CK_GradeDrafts_Half_Step",
                    "(\"Midterm1Points\" IS NULL OR \"Midterm1Points\" * 2 = FLOOR(\"Midterm1Points\" * 2)) " +
                    "AND (\"Midterm2Points\" IS NULL OR \"Midterm2Points\" * 2 = FLOOR(\"Midterm2Points\" * 2)) " +
                    "AND (\"AttendancePoints\" IS NULL OR \"AttendancePoints\" * 2 = FLOOR(\"AttendancePoints\" * 2)) " +
                    "AND (\"PracticalPoints\" IS NULL OR \"PracticalPoints\" * 2 = FLOOR(\"PracticalPoints\" * 2)) " +
                    "AND (\"ExamPoints\" IS NULL OR \"ExamPoints\" * 2 = FLOOR(\"ExamPoints\" * 2))");
            });

            entity.HasOne(d => d.Enrollment).WithOne(p => p.GradeDraft)
                .HasForeignKey<GradeDraft>(d => d.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appeal>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.GradeId);

            entity.Property(e => e.Text).HasMaxLength(1000).IsRequired();

            var appealStatusConverter = new EnumToStringConverter<AppealStatus>();
            entity.Property(e => e.Status)
                .HasConversion(appealStatusConverter)
                .HasMaxLength(16)
                .HasDefaultValue(AppealStatus.Pending);

            entity.HasOne(d => d.Grade).WithMany(p => p.Appeals)
                .HasForeignKey(d => d.GradeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(e => e.CreatedByIp).HasMaxLength(45);

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.SubjectName).HasMaxLength(100);
            entity.Property(e => e.ECTS).HasDefaultValue(6);

            entity.HasOne(d => d.Professor).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.ProfessorId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.FirstName).HasMaxLength(50);
            entity.Property(e => e.IndexNumber)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.LastName).HasMaxLength(50);

            entity.Property(e => e.UserPassword).HasMaxLength(255);
            var userRoleConverter = new EnumToStringConverter<RoleEnum>();
            entity.Property(e => e.UserRole).HasConversion(userRoleConverter).HasMaxLength(50);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
