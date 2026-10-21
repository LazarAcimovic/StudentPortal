using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudentPortal.Migrations
{
    /// <inheritdoc />
    public partial class AddEscalationWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedProfessorId",
                table: "Grades",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Escalations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GradeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Escalations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Escalations_Grades_GradeId",
                        column: x => x.GradeId,
                        principalTable: "Grades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EscalationAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EscalationId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedProfessorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedByAdminId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SupersededAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EscalationAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EscalationAssignments_Escalations_EscalationId",
                        column: x => x.EscalationId,
                        principalTable: "Escalations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EscalationAssignments_Users_AssignedByAdminId",
                        column: x => x.AssignedByAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EscalationAssignments_Users_AssignedProfessorId",
                        column: x => x.AssignedProfessorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Grades_AssignedProfessorId",
                table: "Grades",
                column: "AssignedProfessorId");

            migrationBuilder.CreateIndex(
                name: "IX_EscalationAssignments_AssignedByAdminId",
                table: "EscalationAssignments",
                column: "AssignedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_EscalationAssignments_AssignedProfessorId",
                table: "EscalationAssignments",
                column: "AssignedProfessorId");

            migrationBuilder.CreateIndex(
                name: "IX_EscalationAssignments_EscalationId",
                table: "EscalationAssignments",
                column: "EscalationId");

            migrationBuilder.CreateIndex(
                name: "IX_Escalations_GradeId",
                table: "Escalations",
                column: "GradeId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Grades_Users_AssignedProfessorId",
                table: "Grades",
                column: "AssignedProfessorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Grades_Users_AssignedProfessorId",
                table: "Grades");

            migrationBuilder.DropTable(
                name: "EscalationAssignments");

            migrationBuilder.DropTable(
                name: "Escalations");

            migrationBuilder.DropIndex(
                name: "IX_Grades_AssignedProfessorId",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "AssignedProfessorId",
                table: "Grades");
        }
    }
}
