namespace ShelfLifeAPI.Models
{
    public class Genre
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<ItemGenre> ItemGenres { get; set; }
    }
}