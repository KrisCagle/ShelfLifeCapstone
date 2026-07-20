using Microsoft.AspNetCore.Identity;

namespace ShelfLifeAPI.Models
{
    public class ApplicationUser : IdentityUser
    {
        public UserProfile UserProfile { get; set; }
    }
}