using System.ComponentModel.DataAnnotations;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;

namespace ShelfLifeAPI.Dtos
{
    public record LookupDto(int Id, string Name);

    public record FormatDto(int Id, string Name, string MediaType)
    {
        public static FormatDto From(Format f) => new(f.Id, f.Name, f.MediaType);
    }

    public record CatalogEntryDto(
        int Id,
        string Title,
        FormatDto Format,
        int? ReleaseYear,
        string? Creator,
        string? Barcode,
        string? CoverUrl,
        string Source,
        string? ExternalId,
        bool IsPrivate)
    {
        public static CatalogEntryDto From(CatalogEntry c) =>
            new(c.Id, c.Title, FormatDto.From(c.Format), c.ReleaseYear, c.Creator, c.Barcode, c.CoverUrl,
                c.Source, c.ExternalId, c.CreatedByUserId != null);
    }

    public record ItemGenreDto(int GenreId, LookupDto Genre);

    // Flattened for the client: title/format/imageUrl come from the catalog entry.
    public record ItemDto(
        int Id,
        string Title,
        int FormatId,
        FormatDto Format,
        int ConditionId,
        LookupDto Condition,
        decimal PurchasePrice,
        DateTime DateAcquired,
        string? StoreFound,
        string? Notes,
        string? ImageUrl,
        string? PhotoUrl,
        string? Barcode,
        CatalogEntryDto CatalogEntry,
        Dictionary<string, string> Attributes,
        List<ItemGenreDto> ItemGenres)
    {
        public static ItemDto From(Item i) => new(
            i.Id,
            i.CatalogEntry.Title,
            i.CatalogEntry.FormatId,
            FormatDto.From(i.CatalogEntry.Format),
            i.ConditionId,
            new LookupDto(i.Condition.Id, i.Condition.Name),
            i.PurchasePrice,
            i.DateAcquired,
            i.StoreFound,
            i.Notes,
            i.PhotoUrl ?? i.CatalogEntry.CoverUrl,
            i.PhotoUrl,
            i.Barcode,
            CatalogEntryDto.From(i.CatalogEntry),
            MediaAttributes.Parse(i.Attributes),
            (i.ItemGenres ?? []).Select(g => new ItemGenreDto(g.GenreId, new LookupDto(g.Genre.Id, g.Genre.Name))).ToList());
    }

    /// Which title an item or wishlist entry refers to. Either an existing entry (Id),
    /// a metadata-source record (Source + ExternalId, re-fetched by the server), or a
    /// hand-typed title (Source "manual").
    public class CatalogRefDto
    {
        public int? Id { get; set; }

        [MaxLength(20)]
        public string Source { get; set; } = CatalogSources.Manual;

        [MaxLength(64)]
        public string? ExternalId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Pick a format.")]
        public int FormatId { get; set; }

        [Range(1800, 2100)]
        public int? ReleaseYear { get; set; }

        [MaxLength(200)]
        public string? Creator { get; set; }

        [Url, MaxLength(500)]
        public string? CoverUrl { get; set; }
    }

    public class ItemSaveDto
    {
        [Required]
        public CatalogRefDto Catalog { get; set; } = new();

        [Range(1, int.MaxValue, ErrorMessage = "Pick a condition.")]
        public int ConditionId { get; set; }

        [Range(0, 1_000_000)]
        public decimal PurchasePrice { get; set; }

        public DateTime DateAcquired { get; set; }

        [MaxLength(200)]
        public string? StoreFound { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        [Url, MaxLength(500)]
        public string? PhotoUrl { get; set; }

        [RegularExpression(@"^\d{8,14}$", ErrorMessage = "A barcode is 8 to 14 digits.")]
        public string? Barcode { get; set; }

        public List<int>? GenreIds { get; set; }

        public Dictionary<string, string>? Attributes { get; set; }
    }
}
