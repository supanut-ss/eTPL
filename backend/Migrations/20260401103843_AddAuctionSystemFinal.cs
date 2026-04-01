using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAuctionSystemFinal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.CreateTable(
                name: "tbs_auction_board",
                schema: "dbo",
                columns: table => new
                {
                    auction_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlayerId = table.Column<int>(type: "int", nullable: false),
                    InitiatorUserId = table.Column<int>(type: "int", nullable: false),
                    CurrentPrice = table.Column<int>(type: "int", nullable: false),
                    HighestBidderId = table.Column<int>(type: "int", nullable: true),
                    NormalEndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FinalEndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DbStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_board", x => x.auction_id);
                    table.ForeignKey(
                        name: "FK_tbs_auction_board_pes_player_team_PlayerId",
                        column: x => x.PlayerId,
                        principalSchema: "dbo",
                        principalTable: "pes_player_team",
                        principalColumn: "id_player",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbs_auction_board_tbm_user_HighestBidderId",
                        column: x => x.HighestBidderId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbs_auction_board_tbm_user_InitiatorUserId",
                        column: x => x.InitiatorUserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbs_auction_grade_quota",
                schema: "dbo",
                columns: table => new
                {
                    grade_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GradeName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MinOVR = table.Column<int>(type: "int", nullable: false),
                    MaxOVR = table.Column<int>(type: "int", nullable: false),
                    MaxAllowedPerUser = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_grade_quota", x => x.grade_id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_auction_settings",
                schema: "dbo",
                columns: table => new
                {
                    setting_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StartingBudget = table.Column<int>(type: "int", nullable: false),
                    MaxSquadSize = table.Column<int>(type: "int", nullable: false),
                    MinBidPrice = table.Column<int>(type: "int", nullable: false),
                    AuctionStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AuctionEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DailyBidStartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    DailyBidEndTime = table.Column<TimeSpan>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_settings", x => x.setting_id);
                });

            migrationBuilder.CreateTable(
                name: "tbs_auction_squad",
                schema: "dbo",
                columns: table => new
                {
                    squad_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PlayerId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_squad", x => x.squad_id);
                    table.ForeignKey(
                        name: "FK_tbs_auction_squad_pes_player_team_PlayerId",
                        column: x => x.PlayerId,
                        principalSchema: "dbo",
                        principalTable: "pes_player_team",
                        principalColumn: "id_player",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbs_auction_squad_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbs_auction_user_wallet",
                schema: "dbo",
                columns: table => new
                {
                    wallet_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AvailableBalance = table.Column<int>(type: "int", nullable: false),
                    ReservedBalance = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_user_wallet", x => x.wallet_id);
                    table.ForeignKey(
                        name: "FK_tbs_auction_user_wallet_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbs_auction_bid_log",
                schema: "dbo",
                columns: table => new
                {
                    log_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AuctionId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    BidAmount = table.Column<int>(type: "int", nullable: false),
                    Phase = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_bid_log", x => x.log_id);
                    table.ForeignKey(
                        name: "FK_tbs_auction_bid_log_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbs_auction_bid_log_tbs_auction_board_AuctionId",
                        column: x => x.AuctionId,
                        principalSchema: "dbo",
                        principalTable: "tbs_auction_board",
                        principalColumn: "auction_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tbs_auction_grade_quota",
                columns: new[] { "grade_id", "GradeName", "MaxAllowedPerUser", "MaxOVR", "MinOVR" },
                values: new object[,]
                {
                    { 1, "S", 1, 99, 82 },
                    { 2, "A", 1, 81, 81 },
                    { 3, "B", 4, 80, 79 },
                    { 4, "C", 8, 78, 77 },
                    { 5, "D", 8, 76, 75 },
                    { 6, "E", 99, 74, 65 }
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tbs_auction_settings",
                columns: new[] { "setting_id", "AuctionEndDate", "AuctionStartDate", "DailyBidEndTime", "DailyBidStartTime", "MaxSquadSize", "MinBidPrice", "StartingBudget" },
                values: new object[] { 1, null, null, new TimeSpan(0, 23, 59, 59, 0), new TimeSpan(0, 8, 0, 0, 0), 23, 60, 2000 });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_bid_log_AuctionId",
                schema: "dbo",
                table: "tbs_auction_bid_log",
                column: "AuctionId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_bid_log_UserId",
                schema: "dbo",
                table: "tbs_auction_bid_log",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_board_HighestBidderId",
                schema: "dbo",
                table: "tbs_auction_board",
                column: "HighestBidderId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_board_InitiatorUserId",
                schema: "dbo",
                table: "tbs_auction_board",
                column: "InitiatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_board_PlayerId",
                schema: "dbo",
                table: "tbs_auction_board",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_squad_PlayerId",
                schema: "dbo",
                table: "tbs_auction_squad",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_squad_UserId_PlayerId",
                schema: "dbo",
                table: "tbs_auction_squad",
                columns: new[] { "UserId", "PlayerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_user_wallet_UserId",
                schema: "dbo",
                table: "tbs_auction_user_wallet",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_auction_bid_log",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_auction_grade_quota",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_auction_settings",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_auction_squad",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_auction_user_wallet",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tbs_auction_board",
                schema: "dbo");
        }
    }
}
