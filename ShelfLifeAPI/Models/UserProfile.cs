namespace ShelfLifeAPI.Models
{
    public class UserProfile
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string IdentityUserId { get; set; }
        public ApplicationUser IdentityUser { get; set; }
    }
}