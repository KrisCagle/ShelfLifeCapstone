namespace ShelfLifeAPI.Models
{
    public class ItemGenre
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public Item Item { get; set; }
        public int GenreId { get; set; }
        public Genre Genre { get; set; }
    }
}