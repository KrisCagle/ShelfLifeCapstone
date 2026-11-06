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
        public DbSet<NewsPost> NewsPosts { get; set; }
        public DbSet<CatalogEntry> CatalogEntries { get; set; }
        public ShelfLifeDbContext(DbContextOptions<ShelfLifeDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Item>()
                .Property(i => i.PurchasePrice)
                .HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Item>()
                .Property(i => i.Attributes)
                .HasColumnType("jsonb");
            modelBuilder.Entity<Item>()
                .HasOne(i => i.CatalogEntry)
                .WithMany(c => c.Items)
                .HasForeignKey(i => i.CatalogEntryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CatalogEntry>(entry =>
            {
                entry.Property(c => c.Title).HasMaxLength(200);
                entry.Property(c => c.Creator).HasMaxLength(200);
                entry.Property(c => c.Barcode).HasMaxLength(32);
                entry.Property(c => c.Source).HasMaxLength(20);
                entry.Property(c => c.ExternalId).HasMaxLength(64);
                // One shared entry per source record and format.
                entry.HasIndex(c => new { c.Source, c.ExternalId, c.FormatId })
                    .IsUnique()
                    .HasFilter("\"ExternalId\" IS NOT NULL");
                entry.HasIndex(c => c.Barcode);
                entry.HasIndex(c => c.CreatedByUserId);
            });

            modelBuilder.Entity<WishlistItem>()
                .HasOne(w => w.CatalogEntry)
                .WithMany()
                .HasForeignKey(w => w.CatalogEntryId)
                .OnDelete(DeleteBehavior.SetNull);

            // Seed Formats
            modelBuilder.Entity<Format>().HasData(
                new Format { Id = 1, Name = "VHS", MediaType = MediaTypes.Movies },
                new Format { Id = 2, Name = "CD", MediaType = MediaTypes.Music },
                new Format { Id = 3, Name = "Vinyl", MediaType = MediaTypes.Music },
                new Format { Id = 4, Name = "NES", MediaType = MediaTypes.Games },
                new Format { Id = 5, Name = "SNES", MediaType = MediaTypes.Games },
                new Format { Id = 6, Name = "N64", MediaType = MediaTypes.Games },
                new Format { Id = 7, Name = "PS1", MediaType = MediaTypes.Games },
                new Format { Id = 8, Name = "PS2", MediaType = MediaTypes.Games },
                new Format { Id = 9, Name = "GameBoy", MediaType = MediaTypes.Games },
                new Format { Id = 10, Name = "GameBoy Advance", MediaType = MediaTypes.Games },
                new Format { Id = 11, Name = "GameCube", MediaType = MediaTypes.Games },
                new Format { Id = 12, Name = "Sega Genesis", MediaType = MediaTypes.Games },
                new Format { Id = 13, Name = "Nintendo Switch", MediaType = MediaTypes.Games },
                new Format { Id = 14, Name = "Nintendo Switch 2", MediaType = MediaTypes.Games }
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