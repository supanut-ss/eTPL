using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCupSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbs_cup_fixture",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    season = table.Column<int>(type: "int", nullable: false),
                    round = table.Column<int>(type: "int", nullable: false),
                    match_no = table.Column<int>(type: "int", nullable: false),
                    home_user_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    away_user_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    home_score = table.Column<int>(type: "int", nullable: true),
                    away_score = table.Column<int>(type: "int", nullable: true),
                    next_match_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    is_played = table.Column<bool>(type: "bit", nullable: false),
                    is_bye = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_cup_fixture", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_notifications",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TargetUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tbs_notifications_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_notifications_UserId",
                schema: "dbo",
                table: "tbs_notifications",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_cup_fixture",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_notifications",
                schema: "dbo");
        }
    }
}
