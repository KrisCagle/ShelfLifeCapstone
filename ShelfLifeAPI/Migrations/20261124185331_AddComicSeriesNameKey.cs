using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShelfLifeAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddComicSeriesNameKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NameKey",
                table: "ComicSeries",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(regexp_replace(\"Name\", '[^[:alnum:]]', '', 'g'))",
                stored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NameKey",
                table: "ComicSeries");
        }
    }
}
