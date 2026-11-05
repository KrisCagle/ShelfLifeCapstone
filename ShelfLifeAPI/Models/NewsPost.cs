namespace ShelfLifeAPI.Models
{
    // An announcement written by the ShelfLife team, shown above the RSS headlines.
    public class NewsPost
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? LinkUrl { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsPinned { get; set; }
        public DateTime PublishedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
