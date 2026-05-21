using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIsMarketRound2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsMarketRound2",
                schema: "dbo",
                table: "tbs_auction_settings",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsMarketRound2",
                schema: "dbo",
                table: "tbs_auction_settings");
        }
    }
}
