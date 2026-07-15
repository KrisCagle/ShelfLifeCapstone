namespace ShelfLifeAPI.Models
{
    public class Condition
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<Item> Items { get; set; }
    }
}