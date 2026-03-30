using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTbmPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbm_permission",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    menu_key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    menu_label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    user_level = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    can_access = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbm_permission", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbm_permission_menu_key_user_level",
                table: "tbm_permission",
                columns: new[] { "menu_key", "user_level" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbm_permission");
        }
    }
}
