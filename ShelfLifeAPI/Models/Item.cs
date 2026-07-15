namespace ShelfLifeAPI.Models
{
    public class Item
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }
        public int FormatId { get; set; }
        public Format Format { get; set; }
        public int ConditionId { get; set; }
        public Condition Condition { get; set; }
        public string Title { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime DateAcquired { get; set; }
        public string StoreFound { get; set; }
        public string Notes { get; set; }
        public string ImageUrl { get; set; }
        public int Priority { get; set; }
        public List<ItemGenre> ItemGenres { get; set; }
    }
}