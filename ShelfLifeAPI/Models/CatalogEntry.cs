namespace ShelfLifeAPI.Models
{
    // A title on a specific format: "Chrono Trigger" on SNES, "Kind of Blue" on Vinyl.
    // Entries from a metadata source (IGDB, MusicBrainz, TMDB) are shared by every user;
    // entries typed in by hand are private to the user who created them.
    public class CatalogEntry
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int FormatId { get; set; }
        public Format Format { get; set; } = null!;
        public int? ReleaseYear { get; set; }

        // Publisher for games, artist for music, studio for movies.
        public string? Creator { get; set; }
        public string? Barcode { get; set; }
        public string? CoverUrl { get; set; }

        // "manual", "igdb", "musicbrainz", "tmdb" or "upc"; ExternalId is that source's id.
        public string Source { get; set; } = CatalogSources.Manual;
        public string? ExternalId { get; set; }

        // Set for manual entries (private to this user); null for shared entries.
        public string? CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<Item> Items { get; set; } = [];
    }

    public static class CatalogSources
    {
        public const string Manual = "manual";
        public const string Igdb = "igdb";
        public const string MusicBrainz = "musicbrainz";
        public const string Tmdb = "tmdb";
        public const string Upc = "upc";
    }
}
