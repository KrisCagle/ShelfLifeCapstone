namespace ShelfLifeAPI.Models
{
    public class Format
    {
        public int Id { get; set; }
        public string Name { get; set; }

        // "Games", "Music" or "Movies"; decides which metadata source and attributes apply.
        public string MediaType { get; set; } = MediaTypes.Games;
    }

    public static class MediaTypes
    {
        public const string Games = "Games";
        public const string Music = "Music";
        public const string Movies = "Movies";
        public const string Books = "Books";
    }
}
