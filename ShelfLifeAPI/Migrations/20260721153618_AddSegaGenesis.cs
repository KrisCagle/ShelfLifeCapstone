using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShelfLifeAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSegaGenesis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Formats",
                columns: new[] { "Id", "Name" },
                values: new object[] { 12, "Sega Genesis" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 12);
        }
    }
}
