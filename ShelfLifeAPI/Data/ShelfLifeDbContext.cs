using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Data
{
    public class ShelfLifeDbContext : IdentityDbContext<ApplicationUser>
    {
        public DbSet<Item> Items { get; set; }
        public DbSet<Format> Formats { get; set; }
        public DbSet<Condition> Conditions { get; set; }
        public DbSet<Genre> Genres { get; set; }
        public DbSet<ItemGenre> ItemGenres { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<WishlistItem> WishlistItems { get; set; }
        public ShelfLifeDbContext(DbContextOptions<ShelfLifeDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Item>()
                .Property(i => i.PurchasePrice)
                .HasColumnType("decimal(18,2)");
            // Seed Formats
            modelBuilder.Entity<Format>().HasData(
                new Format { Id = 1, Name = "VHS" },
                new Format { Id = 2, Name = "CD" },
                new Format { Id = 3, Name = "Vinyl" },
                new Format { Id = 4, Name = "NES" },
                new Format { Id = 5, Name = "SNES" },
                new Format { Id = 6, Name = "N64" },
                new Format { Id = 7, Name = "PS1" },
                new Format { Id = 8, Name = "PS2" },
                new Format { Id = 9, Name = "GameBoy" },
                new Format { Id = 10, Name = "GameBoy Advance" },
                new Format { Id = 11, Name = "GameCube" }
            );

            // Seed Conditions
            modelBuilder.Entity<Condition>().HasData(
                new Condition { Id = 1, Name = "Sealed" },
                new Condition { Id = 2, Name = "Good" },
                new Condition { Id = 3, Name = "Fair" },
                new Condition { Id = 4, Name = "Poor" }
            );

            // Seed Genres
            modelBuilder.Entity<Genre>().HasData(
                new Genre { Id = 1, Name = "Action" },
                new Genre { Id = 2, Name = "Comedy" },
                new Genre { Id = 3, Name = "Horror" },
                new Genre { Id = 4, Name = "Drama" },
                new Genre { Id = 5, Name = "Sci-Fi" },
                new Genre { Id = 6, Name = "RPG" },
                new Genre { Id = 7, Name = "Platformer" },
                new Genre { Id = 8, Name = "Shooter" },
                new Genre { Id = 9, Name = "Sports" },
                new Genre { Id = 10, Name = "Thriller" },
                new Genre { Id = 11, Name = "Animation" },
                new Genre { Id = 12, Name = "Documentary" },
                new Genre { Id = 13, Name = "Rock" },
                new Genre { Id = 14, Name = "Hip Hop" },
                new Genre { Id = 15, Name = "Jazz" },
                new Genre { Id = 16, Name = "Electronic" },
                new Genre { Id = 17, Name = "Classical" },
                new Genre { Id = 18, Name = "Country" },
                new Genre { Id = 19, Name = "R&B" },
                new Genre { Id = 20, Name = "Pop" }
            );
        }
    }
}