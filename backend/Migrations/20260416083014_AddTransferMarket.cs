using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferMarket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ListingPrice",
                schema: "dbo",
                table: "tbs_auction_squad",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tbs_transfer_offer",
                schema: "dbo",
                columns: table => new
                {
                    offer_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SquadId = table.Column<int>(type: "int", nullable: false),
                    FromUserId = table.Column<int>(type: "int", nullable: false),
                    ToUserId = table.Column<int>(type: "int", nullable: false),
                    OfferType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Transfer"),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_transfer_offer", x => x.offer_id);
                    table.ForeignKey(
                        name: "FK_tbs_transfer_offer_tbm_user_FromUserId",
                        column: x => x.FromUserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbs_transfer_offer_tbm_user_ToUserId",
                        column: x => x.ToUserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbs_transfer_offer_tbs_auction_squad_SquadId",
                        column: x => x.SquadId,
                        principalSchema: "dbo",
                        principalTable: "tbs_auction_squad",
                        principalColumn: "squad_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_transfer_offer_FromUserId",
                schema: "dbo",
                table: "tbs_transfer_offer",
                column: "FromUserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_transfer_offer_SquadId",
                schema: "dbo",
                table: "tbs_transfer_offer",
                column: "SquadId");

            migrationBuilder.CreateIndex(
                name: "IX_tbs_transfer_offer_ToUserId",
                schema: "dbo",
                table: "tbs_transfer_offer",
                column: "ToUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_transfer_offer",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "ListingPrice",
                schema: "dbo",
                table: "tbs_auction_squad");
        }
    }
}
