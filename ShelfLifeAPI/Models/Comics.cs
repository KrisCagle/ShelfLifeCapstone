namespace ShelfLifeAPI.Models
{
    // Reference data imported from the Grand Comics Database's data dump (CC BY-SA 4.0) by
    // tools/GcdImport. Ids are GCD's own, so every row links back to comics.org, which GCD's
    // licence asks for. These tables are replaced wholesale on each import; nothing in
    // ShelfLife writes to them otherwise.

    public class ComicSeries
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        /// The name lowercased with everything but letters and digits removed, so
        /// "Batman / Superman" and "batman/superman" compare equal. Postgres computes it.
        public string NameKey { get; set; } = string.Empty;
        public int? YearBegan { get; set; }
        public string? Publisher { get; set; }
        /// ISO 639 code, such as "en".
        public string? Language { get; set; }
        public int IssueCount { get; set; }
        public int? FirstIssueId { get; set; }
    }

    public class ComicIssue
    {
        public int Id { get; set; }
        public int SeriesId { get; set; }
        public ComicSeries Series { get; set; } = null!;
        /// As printed: "300", "1/2", "Annual 1".
        public string Number { get; set; } = string.Empty;
        /// "Newsstand", "Cover B", and so on; null for the main edition.
        public string? VariantName { get; set; }
        public int? VariantOfId { get; set; }
        public string? Title { get; set; }
        public int? Year { get; set; }
        /// The full printed barcode, including any 5-digit add-on.
        public string? Barcode { get; set; }
        /// The main UPC or EAN without the add-on: what a scanner that ignores add-ons reads.
        public string? BarcodeMain { get; set; }
        public string? Isbn { get; set; }
    }
}
