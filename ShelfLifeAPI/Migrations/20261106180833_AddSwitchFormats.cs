using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ShelfLifeAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSwitchFormats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Formats",
                columns: new[] { "Id", "MediaType", "Name" },
                values: new object[,]
                {
                    { 13, "Games", "Nintendo Switch" },
                    { 14, "Games", "Nintendo Switch 2" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 14);
        }
    }
}
