namespace ShelfLifeAPI.Models
{
    public class WishlistItem
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }
        public int FormatId { get; set; }
        public Format Format { get; set; }
        public string Title { get; set; }
        public string Notes { get; set; }
        public int Priority { get; set; }

        // Optional link to the exact title being hunted (for cover art and "Found it").
        public int? CatalogEntryId { get; set; }
        public CatalogEntry? CatalogEntry { get; set; }
    }
}
