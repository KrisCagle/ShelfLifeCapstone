using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Dtos;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services.Metadata;

namespace ShelfLifeAPI.Services
{
    public class CatalogService
    {
        private readonly ShelfLifeDbContext _db;
        private readonly MetadataService _metadata;

        public CatalogService(ShelfLifeDbContext db, MetadataService metadata)
        {
            _db = db;
            _metadata = metadata;
        }

        /// Shared entries plus this user's private (hand-typed) ones.
        public IQueryable<CatalogEntry> VisibleTo(string userId) =>
            _db.CatalogEntries.Where(c => c.CreatedByUserId == null || c.CreatedByUserId == userId);

        /// Finds or creates the catalog entry a save refers to.
        /// - Existing id: used as-is; if it's the user's own manual entry, its fields are updated.
        /// - Source record: the server re-fetches it, so shared entries only hold source data.
        ///   If the source can't be reached, it becomes a private manual entry instead.
        /// - Manual: a new private entry.
        public async Task<(CatalogEntry? Entry, string? Error)> ResolveAsync(string userId, CatalogRefDto reference, CancellationToken cancellationToken)
        {
            var format = await _db.Formats.FindAsync([reference.FormatId], cancellationToken);
            if (format == null)
                return (null, "Pick a format.");

            if (reference.Id is int id)
            {
                var existing = await VisibleTo(userId).Include(c => c.Format).FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
                if (existing == null)
                    return (null, "That title isn't in the catalog anymore.");
                if (existing.CreatedByUserId == userId)
                    ApplyManualFields(existing, reference, format);
                return (existing, null);
            }

            if (reference.Source != CatalogSources.Manual && reference.Source != CatalogSources.Upc && !string.IsNullOrEmpty(reference.ExternalId))
            {
                var shared = await _db.CatalogEntries.Include(c => c.Format).FirstOrDefaultAsync(c =>
                    c.Source == reference.Source && c.ExternalId == reference.ExternalId && c.FormatId == format.Id, cancellationToken);
                if (shared != null)
                    return (shared, null);

                var record = await _metadata.GetAsync(reference.Source, reference.ExternalId, format, cancellationToken);
                if (record != null)
                {
                    var entry = new CatalogEntry
                    {
                        Title = Truncate(record.Title, 200)!,
                        Format = format,
                        ReleaseYear = record.ReleaseYear,
                        Creator = Truncate(record.Creator, 200),
                        CoverUrl = record.CoverUrl,
                        Barcode = record.Source == CatalogSources.MusicBrainz ? record.Barcode : null,
                        Source = record.Source,
                        ExternalId = record.ExternalId,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.CatalogEntries.Add(entry);
                    return (entry, null);
                }
            }

            var manual = new CatalogEntry { Source = CatalogSources.Manual, CreatedByUserId = userId, CreatedAt = DateTime.UtcNow };
            ApplyManualFields(manual, reference, format);
            _db.CatalogEntries.Add(manual);
            return (manual, null);
        }

        private static void ApplyManualFields(CatalogEntry entry, CatalogRefDto reference, Format format)
        {
            entry.Title = reference.Title.Trim();
            entry.Format = format;
            entry.FormatId = format.Id;
            entry.ReleaseYear = reference.ReleaseYear;
            entry.Creator = string.IsNullOrWhiteSpace(reference.Creator) ? null : reference.Creator.Trim();
            entry.CoverUrl = string.IsNullOrWhiteSpace(reference.CoverUrl) ? null : reference.CoverUrl.Trim();
        }

        private static string? Truncate(string? value, int max) =>
            value == null ? null : value.Length <= max ? value : value[..max];

        public static string Normalize(string title) =>
            new string(title.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
    }
}
