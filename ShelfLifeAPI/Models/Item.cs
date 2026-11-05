namespace ShelfLifeAPI.Models
{
    // One physical copy a user owns. What the title *is* lives on CatalogEntry;
    // this holds what's true about *their copy*.
    public class Item
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }
        public int CatalogEntryId { get; set; }
        public CatalogEntry CatalogEntry { get; set; }
        public int ConditionId { get; set; }
        public Condition Condition { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime DateAcquired { get; set; }
        public string StoreFound { get; set; }
        public string Notes { get; set; }

        // The user's own photo of their copy; the catalog cover is used when empty.
        public string? PhotoUrl { get; set; }

        // Barcode scanned from this copy. Kept per copy (not on the shared catalog entry)
        // so one user's scan can't relabel a title for everyone.
        public string? Barcode { get; set; }

        // Media-specific details (box/manual, pressing, case type…) as a JSON object
        // of string values. Keys come from MediaAttributes.
        public string? Attributes { get; set; }

        public List<ItemGenre> ItemGenres { get; set; }
    }
}
