using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWorldCupPrediction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbs_special_group",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    tournament_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    group_name = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    group_order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_special_group", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_special_match",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    tournament_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    phase = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    group_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    round = table.Column<int>(type: "int", nullable: false),
                    match_no = table.Column<int>(type: "int", nullable: false),
                    home_participant_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    away_participant_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    home_score = table.Column<int>(type: "int", nullable: true),
                    away_score = table.Column<int>(type: "int", nullable: true),
                    is_played = table.Column<bool>(type: "bit", nullable: false),
                    is_bye = table.Column<bool>(type: "bit", nullable: false),
                    next_match_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    winner_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_special_match", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_special_participant",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    tournament_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    display_name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    team_name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    logo_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    seed = table.Column<int>(type: "int", nullable: true),
                    group_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    is_eliminated = table.Column<bool>(type: "bit", nullable: false),
                    registration_order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_special_participant", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_special_tournament",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    format = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    is_public = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    created_by = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    group_count = table.Column<int>(type: "int", nullable: true),
                    teams_advance_per_group = table.Column<int>(type: "int", nullable: true),
                    sponsor_banner_url = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_special_tournament", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_world_cup_prediction",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PredictedTeam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_world_cup_prediction", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbs_world_cup_prediction_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_world_cup_prediction_UserId",
                schema: "dbo",
                table: "tbs_world_cup_prediction",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_special_group",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_special_match",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_special_participant",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_special_tournament",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_world_cup_prediction",
                schema: "dbo");
        }
    }
}
