using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShelfLifeAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddComicReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateTable(
                name: "ComicSeries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    YearBegan = table.Column<int>(type: "integer", nullable: true),
                    Publisher = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    IssueCount = table.Column<int>(type: "integer", nullable: false),
                    FirstIssueId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComicSeries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ComicIssues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    SeriesId = table.Column<int>(type: "integer", nullable: false),
                    Number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VariantName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    VariantOfId = table.Column<int>(type: "integer", nullable: true),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Year = table.Column<int>(type: "integer", nullable: true),
                    Barcode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BarcodeMain = table.Column<string>(type: "character varying(14)", maxLength: 14, nullable: true),
                    Isbn = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComicIssues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComicIssues_ComicSeries_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "ComicSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ComicIssues_Barcode",
                table: "ComicIssues",
                column: "Barcode");

            migrationBuilder.CreateIndex(
                name: "IX_ComicIssues_BarcodeMain",
                table: "ComicIssues",
                column: "BarcodeMain");

            migrationBuilder.CreateIndex(
                name: "IX_ComicIssues_Isbn",
                table: "ComicIssues",
                column: "Isbn");

            migrationBuilder.CreateIndex(
                name: "IX_ComicIssues_SeriesId_Number",
                table: "ComicIssues",
                columns: new[] { "SeriesId", "Number" });

            migrationBuilder.CreateIndex(
                name: "IX_ComicSeries_Name",
                table: "ComicSeries",
                column: "Name")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComicIssues");

            migrationBuilder.DropTable(
                name: "ComicSeries");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }
    }
}
