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
    }
}