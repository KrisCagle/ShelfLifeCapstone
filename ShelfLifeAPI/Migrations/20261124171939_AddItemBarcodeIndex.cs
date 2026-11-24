using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShelfLifeAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddItemBarcodeIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Items_Barcode",
                table: "Items",
                column: "Barcode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Items_Barcode",
                table: "Items");
        }
    }
}
