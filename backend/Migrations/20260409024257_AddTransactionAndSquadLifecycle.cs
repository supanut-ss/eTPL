using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionAndSquadLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Squad lifecycle columns (may already exist if migration was partially applied)
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'AcquiredAt') ALTER TABLE [dbo].[tbs_auction_squad] ADD [AcquiredAt] datetime2 NOT NULL DEFAULT (GETUTCDATE());");
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'ContractUntil') ALTER TABLE [dbo].[tbs_auction_squad] ADD [ContractUntil] datetime2 NULL;");
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'IsLoan') ALTER TABLE [dbo].[tbs_auction_squad] ADD [IsLoan] bit NOT NULL DEFAULT 0;");
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'LoanExpiry') ALTER TABLE [dbo].[tbs_auction_squad] ADD [LoanExpiry] datetime2 NULL;");
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'LoanedFromUserId') ALTER TABLE [dbo].[tbs_auction_squad] ADD [LoanedFromUserId] int NULL;");
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'PricePaid') ALTER TABLE [dbo].[tbs_auction_squad] ADD [PricePaid] int NOT NULL DEFAULT 0;");
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_squad') AND name = 'Status') ALTER TABLE [dbo].[tbs_auction_squad] ADD [Status] nvarchar(20) NOT NULL DEFAULT N'Active';");

            // These columns may already exist (added via ExecuteSqlRawAsync in the controller)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_settings') AND name = 'FinalBidDurationMinutes')
                    ALTER TABLE [dbo].[tbs_auction_settings] ADD [FinalBidDurationMinutes] int NOT NULL DEFAULT 1440;
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_settings') AND name = 'NormalBidDurationMinutes')
                    ALTER TABLE [dbo].[tbs_auction_settings] ADD [NormalBidDurationMinutes] int NOT NULL DEFAULT 1200;
            ");

            migrationBuilder.CreateTable(
                name: "tbs_auction_transactions",
                schema: "dbo",
                columns: table => new
                {
                    transaction_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "DEBIT"),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    BalanceAfter = table.Column<int>(type: "int", nullable: false),
                    RelatedAuctionId = table.Column<int>(type: "int", nullable: true),
                    RelatedPlayerId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbs_auction_transactions", x => x.transaction_id);
                    table.ForeignKey(
                        name: "FK_tbs_auction_transactions_tbm_user_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "tbm_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tbs_auction_settings",
                keyColumn: "setting_id",
                keyValue: 1,
                columns: new[] { "FinalBidDurationMinutes", "NormalBidDurationMinutes" },
                values: new object[] { 1440, 1200 });

            migrationBuilder.CreateIndex(
                name: "IX_tbs_auction_transactions_UserId",
                schema: "dbo",
                table: "tbs_auction_transactions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbs_auction_transactions",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "AcquiredAt",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "ContractUntil",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "IsLoan",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "LoanExpiry",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "LoanedFromUserId",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "PricePaid",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "dbo",
                table: "tbs_auction_squad");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_settings') AND name = 'FinalBidDurationMinutes')
                    ALTER TABLE [dbo].[tbs_auction_settings] DROP COLUMN [FinalBidDurationMinutes];
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_settings') AND name = 'NormalBidDurationMinutes')
                    ALTER TABLE [dbo].[tbs_auction_settings] DROP COLUMN [NormalBidDurationMinutes];
            ");
        }
    }
}
