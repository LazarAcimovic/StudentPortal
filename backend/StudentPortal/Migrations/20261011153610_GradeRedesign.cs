using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudentPortal.Migrations
{
    /// <inheritdoc />
    public partial class GradeRedesign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Grades_Enrollments_EnrollmentId",
                table: "Grades");

            migrationBuilder.DropIndex(
                name: "IX_Grades_EnrollmentId",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Grade_Range",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "Comment",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "IsConfirmed",
                table: "Grades");

            migrationBuilder.RenameColumn(
                name: "Grade",
                table: "Grades",
                newName: "FinalGrade");

            migrationBuilder.AddColumn<decimal>(
                name: "AttendancePoints",
                table: "Grades",
                type: "numeric(3,1)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmedAt",
                table: "Grades",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "ExamPoints",
                table: "Grades",
                type: "numeric(4,1)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinalizedAt",
                table: "Grades",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Midterm1Points",
                table: "Grades",
                type: "numeric(4,1)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Midterm2Points",
                table: "Grades",
                type: "numeric(4,1)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PracticalPoints",
                table: "Grades",
                type: "numeric(3,1)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "StudentConfirmedAt",
                table: "Grades",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Appeals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GradeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "Pending"),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appeals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appeals_Grades_GradeId",
                        column: x => x.GradeId,
                        principalTable: "Grades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GradeDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EnrollmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Midterm1Points = table.Column<decimal>(type: "numeric(4,1)", nullable: true),
                    Midterm2Points = table.Column<decimal>(type: "numeric(4,1)", nullable: true),
                    AttendancePoints = table.Column<decimal>(type: "numeric(3,1)", nullable: true),
                    PracticalPoints = table.Column<decimal>(type: "numeric(3,1)", nullable: true),
                    ExamPoints = table.Column<decimal>(type: "numeric(4,1)", nullable: true),
                    LastEditedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradeDrafts", x => x.Id);
                    table.CheckConstraint("CK_GradeDrafts_Attendance_Range", "\"AttendancePoints\" IS NULL OR \"AttendancePoints\" BETWEEN 0 AND 5");
                    table.CheckConstraint("CK_GradeDrafts_Exam_Range", "\"ExamPoints\" IS NULL OR \"ExamPoints\" BETWEEN 0 AND 30");
                    table.CheckConstraint("CK_GradeDrafts_Half_Step", "(\"Midterm1Points\" IS NULL OR \"Midterm1Points\" * 2 = FLOOR(\"Midterm1Points\" * 2)) AND (\"Midterm2Points\" IS NULL OR \"Midterm2Points\" * 2 = FLOOR(\"Midterm2Points\" * 2)) AND (\"AttendancePoints\" IS NULL OR \"AttendancePoints\" * 2 = FLOOR(\"AttendancePoints\" * 2)) AND (\"PracticalPoints\" IS NULL OR \"PracticalPoints\" * 2 = FLOOR(\"PracticalPoints\" * 2)) AND (\"ExamPoints\" IS NULL OR \"ExamPoints\" * 2 = FLOOR(\"ExamPoints\" * 2))");
                    table.CheckConstraint("CK_GradeDrafts_Midterm1_Range", "\"Midterm1Points\" IS NULL OR \"Midterm1Points\" BETWEEN 0 AND 30");
                    table.CheckConstraint("CK_GradeDrafts_Midterm2_Range", "\"Midterm2Points\" IS NULL OR \"Midterm2Points\" BETWEEN 0 AND 30");
                    table.CheckConstraint("CK_GradeDrafts_Practical_Range", "\"PracticalPoints\" IS NULL OR \"PracticalPoints\" BETWEEN 0 AND 5");
                    table.ForeignKey(
                        name: "FK_GradeDrafts_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "Enrollments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Grades_EnrollmentId",
                table: "Grades",
                column: "EnrollmentId",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Attendance_Range",
                table: "Grades",
                sql: "\"AttendancePoints\" BETWEEN 0 AND 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Exam_Range",
                table: "Grades",
                sql: "\"ExamPoints\" BETWEEN 0 AND 30");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_FinalGrade_Range",
                table: "Grades",
                sql: "\"FinalGrade\" BETWEEN 5 AND 10");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Half_Step",
                table: "Grades",
                sql: "\"Midterm1Points\" * 2 = FLOOR(\"Midterm1Points\" * 2) AND \"Midterm2Points\" * 2 = FLOOR(\"Midterm2Points\" * 2) AND \"AttendancePoints\" * 2 = FLOOR(\"AttendancePoints\" * 2) AND \"PracticalPoints\" * 2 = FLOOR(\"PracticalPoints\" * 2) AND \"ExamPoints\" * 2 = FLOOR(\"ExamPoints\" * 2)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Midterm1_Range",
                table: "Grades",
                sql: "\"Midterm1Points\" BETWEEN 0 AND 30");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Midterm2_Range",
                table: "Grades",
                sql: "\"Midterm2Points\" BETWEEN 0 AND 30");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Practical_Range",
                table: "Grades",
                sql: "\"PracticalPoints\" BETWEEN 0 AND 5");

            migrationBuilder.CreateIndex(
                name: "IX_Appeals_GradeId",
                table: "Appeals",
                column: "GradeId");

            migrationBuilder.CreateIndex(
                name: "IX_GradeDrafts_EnrollmentId",
                table: "GradeDrafts",
                column: "EnrollmentId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Grades_Enrollments_EnrollmentId",
                table: "Grades",
                column: "EnrollmentId",
                principalTable: "Enrollments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Grades_Enrollments_EnrollmentId",
                table: "Grades");

            migrationBuilder.DropTable(
                name: "Appeals");

            migrationBuilder.DropTable(
                name: "GradeDrafts");

            migrationBuilder.DropIndex(
                name: "IX_Grades_EnrollmentId",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Attendance_Range",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Exam_Range",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_FinalGrade_Range",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Half_Step",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Midterm1_Range",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Midterm2_Range",
                table: "Grades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Grades_Practical_Range",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "AttendancePoints",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "ExamPoints",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "FinalizedAt",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "Midterm1Points",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "Midterm2Points",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "PracticalPoints",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "StudentConfirmedAt",
                table: "Grades");

            migrationBuilder.RenameColumn(
                name: "FinalGrade",
                table: "Grades",
                newName: "Grade");

            migrationBuilder.AddColumn<string>(
                name: "Comment",
                table: "Grades",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsConfirmed",
                table: "Grades",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Grades_EnrollmentId",
                table: "Grades",
                column: "EnrollmentId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Grades_Grade_Range",
                table: "Grades",
                sql: "\"Grade\" >= 5 AND \"Grade\" <= 10");

            migrationBuilder.AddForeignKey(
                name: "FK_Grades_Enrollments_EnrollmentId",
                table: "Grades",
                column: "EnrollmentId",
                principalTable: "Enrollments",
                principalColumn: "Id");
        }
    }
}
