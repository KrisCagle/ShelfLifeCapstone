using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ShelfLifeAPI.Migrations
{
    /// <summary>
    /// Splits "what the title is" (CatalogEntries) from "the copy a user owns" (Items).
    /// Hand-ordered so no data is lost: every existing item becomes a private manual
    /// catalog entry holding its title, format and cover before those columns are dropped.
    /// </summary>
    public partial class CatalogEntries : Migration
    {
        private static readonly (int Id, string MediaType)[] FormatMedia =
        [
            (1, "Movies"), (2, "Music"), (3, "Music"), (4, "Games"), (5, "Games"), (6, "Games"),
            (7, "Games"), (8, "Games"), (9, "Games"), (10, "Games"), (11, "Games"), (12, "Games"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Formats know their media type.
            migrationBuilder.AddColumn<string>(
                name: "MediaType",
                table: "Formats",
                type: "text",
                nullable: false,
                defaultValue: "Games");

            foreach (var (id, mediaType) in FormatMedia)
                migrationBuilder.UpdateData(table: "Formats", keyColumn: "Id", keyValue: id, column: "MediaType", value: mediaType);

            // 2. The catalog.
            migrationBuilder.CreateTable(
                name: "CatalogEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FormatId = table.Column<int>(type: "integer", nullable: false),
                    ReleaseYear = table.Column<int>(type: "integer", nullable: true),
                    Creator = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Barcode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    CoverUrl = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExternalId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogEntries_Formats_FormatId",
                        column: x => x.FormatId,
                        principalTable: "Formats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 3. New per-copy columns (CatalogEntryId nullable until it's filled in).
            migrationBuilder.AddColumn<int>(name: "CatalogEntryId", table: "Items", type: "integer", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Attributes", table: "Items", type: "jsonb", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Barcode", table: "Items", type: "text", nullable: true);
            migrationBuilder.AddColumn<string>(name: "PhotoUrl", table: "Items", type: "text", nullable: true);

            // 4. Move each item's title/format/cover into its own private catalog entry.
            migrationBuilder.Sql("""
                ALTER TABLE "CatalogEntries" ADD COLUMN "LegacyItemId" integer;

                INSERT INTO "CatalogEntries" ("Title", "FormatId", "CoverUrl", "Source", "CreatedByUserId", "CreatedAt", "LegacyItemId")
                SELECT LEFT("Title", 200), "FormatId", NULLIF(TRIM("ImageUrl"), ''), 'manual', "UserId",
                       now() AT TIME ZONE 'utc', "Id"
                FROM "Items";

                UPDATE "Items" i
                SET "CatalogEntryId" = c."Id"
                FROM "CatalogEntries" c
                WHERE c."LegacyItemId" = i."Id";

                ALTER TABLE "CatalogEntries" DROP COLUMN "LegacyItemId";
                """);

            migrationBuilder.AlterColumn<int>(
                name: "CatalogEntryId",
                table: "Items",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            // 5. Drop the columns that now live on the catalog (Priority was never used).
            migrationBuilder.DropForeignKey(name: "FK_Items_Formats_FormatId", table: "Items");
            migrationBuilder.DropIndex(name: "IX_Items_FormatId", table: "Items");
            migrationBuilder.DropColumn(name: "FormatId", table: "Items");
            migrationBuilder.DropColumn(name: "ImageUrl", table: "Items");
            migrationBuilder.DropColumn(name: "Title", table: "Items");
            migrationBuilder.DropColumn(name: "Priority", table: "Items");

            // 6. Wishlist entries can point at a catalog entry.
            migrationBuilder.AddColumn<int>(name: "CatalogEntryId", table: "WishlistItems", type: "integer", nullable: true);

            // 7. Indexes and keys.
            migrationBuilder.CreateIndex(name: "IX_WishlistItems_CatalogEntryId", table: "WishlistItems", column: "CatalogEntryId");
            migrationBuilder.CreateIndex(name: "IX_Items_CatalogEntryId", table: "Items", column: "CatalogEntryId");
            migrationBuilder.CreateIndex(name: "IX_CatalogEntries_Barcode", table: "CatalogEntries", column: "Barcode");
            migrationBuilder.CreateIndex(name: "IX_CatalogEntries_CreatedByUserId", table: "CatalogEntries", column: "CreatedByUserId");
            migrationBuilder.CreateIndex(name: "IX_CatalogEntries_FormatId", table: "CatalogEntries", column: "FormatId");
            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntries_Source_ExternalId_FormatId",
                table: "CatalogEntries",
                columns: new[] { "Source", "ExternalId", "FormatId" },
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Items_CatalogEntries_CatalogEntryId",
                table: "Items",
                column: "CatalogEntryId",
                principalTable: "CatalogEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WishlistItems_CatalogEntries_CatalogEntryId",
                table: "WishlistItems",
                column: "CatalogEntryId",
                principalTable: "CatalogEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Copy title/format/cover back onto items before dropping the catalog.
            migrationBuilder.AddColumn<int>(name: "FormatId", table: "Items", type: "integer", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Title", table: "Items", type: "text", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ImageUrl", table: "Items", type: "text", nullable: true);
            migrationBuilder.AddColumn<int>(name: "Priority", table: "Items", type: "integer", nullable: false, defaultValue: 0);

            migrationBuilder.Sql("""
                UPDATE "Items" i
                SET "Title" = c."Title", "FormatId" = c."FormatId", "ImageUrl" = COALESCE(i."PhotoUrl", c."CoverUrl", '')
                FROM "CatalogEntries" c
                WHERE c."Id" = i."CatalogEntryId";
                """);

            migrationBuilder.AlterColumn<int>(name: "FormatId", table: "Items", type: "integer", nullable: false,
                oldClrType: typeof(int), oldType: "integer", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Title", table: "Items", type: "text", nullable: false,
                oldClrType: typeof(string), oldType: "text", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "ImageUrl", table: "Items", type: "text", nullable: false,
                oldClrType: typeof(string), oldType: "text", oldNullable: true);

            migrationBuilder.DropForeignKey(name: "FK_Items_CatalogEntries_CatalogEntryId", table: "Items");
            migrationBuilder.DropForeignKey(name: "FK_WishlistItems_CatalogEntries_CatalogEntryId", table: "WishlistItems");
            migrationBuilder.DropIndex(name: "IX_WishlistItems_CatalogEntryId", table: "WishlistItems");
            migrationBuilder.DropIndex(name: "IX_Items_CatalogEntryId", table: "Items");
            migrationBuilder.DropColumn(name: "CatalogEntryId", table: "WishlistItems");
            migrationBuilder.DropColumn(name: "CatalogEntryId", table: "Items");
            migrationBuilder.DropColumn(name: "Attributes", table: "Items");
            migrationBuilder.DropColumn(name: "Barcode", table: "Items");
            migrationBuilder.DropColumn(name: "PhotoUrl", table: "Items");
            migrationBuilder.DropTable(name: "CatalogEntries");
            migrationBuilder.DropColumn(name: "MediaType", table: "Formats");

            migrationBuilder.CreateIndex(name: "IX_Items_FormatId", table: "Items", column: "FormatId");
            migrationBuilder.AddForeignKey(
                name: "FK_Items_Formats_FormatId",
                table: "Items",
                column: "FormatId",
                principalTable: "Formats",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
