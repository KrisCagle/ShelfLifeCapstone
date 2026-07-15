using Microsoft.AspNetCore.Identity;

namespace ShelfLifeAPI.Models
{
    public class ApplicationUser : IdentityUser
    {
        public List<Item> Items { get; set; }
    }
}