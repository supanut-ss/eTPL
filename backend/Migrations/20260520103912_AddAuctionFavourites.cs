using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAuctionFavourites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "dbo",
                table: "tbs_auction_user_wallet",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateTable(
                name: "tbs_auction_favourites",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PlayerId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_favourites", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbs_auction_favourites_pes_player_team_PlayerId",
                        column: x => x.PlayerId,
                        principalSchema: "dbo",
                        principalTable: "pes_player_team",
                        principalColumn: "id_player",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbs_auction_favourites_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_favourites_PlayerId",
                schema: "dbo",
                table: "tbs_auction_favourites",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_favourites_UserId_PlayerId",
                schema: "dbo",
                table: "tbs_auction_favourites",
                columns: new[] { "UserId", "PlayerId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_auction_favourites",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "dbo",
                table: "tbs_auction_user_wallet");
        }
    }
}
