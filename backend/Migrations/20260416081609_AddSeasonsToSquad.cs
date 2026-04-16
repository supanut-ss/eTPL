using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSeasonsToSquad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContractUntil",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.AddColumn<int>(
                name: "SeasonsWithTeam",
                schema: "dbo",
                table: "tbs_auction_squad",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CurrentSeason",
                schema: "dbo",
                table: "tbs_auction_settings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_settings",
                keyColumn: "setting_id",
                keyValue: 1,
                column: "CurrentSeason",
                value: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SeasonsWithTeam",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "CurrentSeason",
                schema: "dbo",
                table: "tbs_auction_settings");

            migrationBuilder.AddColumn<DateTime>(
                name: "ContractUntil",
                schema: "dbo",
                table: "tbs_auction_squad",
                type: "datetime2",
                nullable: true);
        }
    }
}
