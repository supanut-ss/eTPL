using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSpecialBonus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                schema: "dbo",
                table: "tbs_transfer_offer",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxSeasonsPerTeam",
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ReleasePercent",
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RenewalPercent",
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "tbs_special_bonus",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_special_bonus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tbs_special_bonus_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                keyColumn: "grade_id",
                keyValue: 1,
                columns: new[] { "MaxSeasonsPerTeam", "ReleasePercent", "RenewalPercent" },
                values: new object[] { 0, 0, 0 });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                keyColumn: "grade_id",
                keyValue: 2,
                columns: new[] { "MaxSeasonsPerTeam", "ReleasePercent", "RenewalPercent" },
                values: new object[] { 0, 0, 0 });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                keyColumn: "grade_id",
                keyValue: 3,
                columns: new[] { "MaxSeasonsPerTeam", "ReleasePercent", "RenewalPercent" },
                values: new object[] { 0, 0, 0 });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                keyColumn: "grade_id",
                keyValue: 4,
                columns: new[] { "MaxSeasonsPerTeam", "ReleasePercent", "RenewalPercent" },
                values: new object[] { 0, 0, 0 });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                keyColumn: "grade_id",
                keyValue: 5,
                columns: new[] { "MaxSeasonsPerTeam", "ReleasePercent", "RenewalPercent" },
                values: new object[] { 0, 0, 0 });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                keyColumn: "grade_id",
                keyValue: 6,
                columns: new[] { "MaxSeasonsPerTeam", "ReleasePercent", "RenewalPercent" },
                values: new object[] { 0, 0, 0 });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_special_bonus_UserId",
                schema: "dbo",
                table: "tbs_special_bonus",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_special_bonus",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "dbo",
                table: "tbs_transfer_offer");

            migrationBuilder.DropColumn(
                name: "MaxSeasonsPerTeam",
                schema: "dbo",
                table: "tbs_auction_grade_quota");

            migrationBuilder.DropColumn(
                name: "ReleasePercent",
                schema: "dbo",
                table: "tbs_auction_grade_quota");

            migrationBuilder.DropColumn(
                name: "RenewalPercent",
                schema: "dbo",
                table: "tbs_auction_grade_quota");
        }
    }
}
