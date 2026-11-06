using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ShelfLifeAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMoreFormats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Formats",
                columns: new[] { "Id", "MediaType", "Name" },
                values: new object[,]
                {
                    { 15, "Games", "PS3" },
                    { 16, "Games", "PS4" },
                    { 17, "Games", "PS5" },
                    { 18, "Games", "Xbox 360" },
                    { 19, "Games", "Xbox One" },
                    { 20, "Games", "Xbox Series X|S" },
                    { 21, "Games", "Wii" },
                    { 22, "Games", "Wii U" },
                    { 23, "Games", "Nintendo DS" },
                    { 24, "Games", "Nintendo 3DS" },
                    { 25, "Movies", "DVD" },
                    { 26, "Movies", "Blu-ray" },
                    { 27, "Movies", "4K Ultra HD" },
                    { 28, "Music", "Cassette" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "Formats",
                keyColumn: "Id",
                keyValue: 28);
        }
    }
}
