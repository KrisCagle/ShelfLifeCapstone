using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services.Metadata;

namespace ShelfLifeAPI.Services
{
    public record RematchProposal(
        int EntryId,
        string Source,
        string Title,
        string Format,
        int? Year,
        int Copies,
        bool HasStockCover,
        string? WikidataId,
        string? WikidataTitle,
        int? WikidataYear,
        string? WikidataCreator,
        string? Reason);

    public record RematchResult(int Switched, int Merged, IReadOnlyList<int> Skipped);

    /// Moves shared catalog entries from IGDB and TMDB to Wikidata (docs/DATA_SOURCES.md,
    /// plan step C3). TMDB's terms forbid keeping its data longer than 6 months, and neither
    /// source may be used in a paid app without an agreement.
    ///
    /// Matching is strict on purpose: same title (ignoring case, punctuation and accents),
    /// same format, and a release year within one of the original. A wrong automatic match
    /// would quietly mislabel someone's collection, so anything less certain is left alone
    /// and reported.
    public class CatalogRematch
    {
        private static readonly string[] OldSources = [CatalogSources.Igdb, CatalogSources.Tmdb];

        private readonly ShelfLifeDbContext _db;
        private readonly MetadataService _metadata;

        public CatalogRematch(ShelfLifeDbContext db, MetadataService metadata)
        {
            _db = db;
            _metadata = metadata;
        }

        public async Task<IReadOnlyList<RematchProposal>> PreviewAsync(CancellationToken cancellationToken)
        {
            var entries = await _db.CatalogEntries
                .Include(c => c.Format)
                .Where(c => c.CreatedByUserId == null && OldSources.Contains(c.Source))
                .OrderBy(c => c.Title)
                .Select(c => new { Entry = c, Copies = c.Items.Count })
                .ToListAsync(cancellationToken);

            var proposals = new List<RematchProposal>();
            foreach (var x in entries)
            {
                var (match, reason) = await FindAsync(x.Entry, cancellationToken);
                proposals.Add(new RematchProposal(x.Entry.Id, x.Entry.Source, x.Entry.Title, x.Entry.Format.Name, x.Entry.ReleaseYear, x.Copies,
                    x.Entry.CoverUrl != null, match?.ExternalId, match?.Title, match?.ReleaseYear, match?.Creator, reason));
            }
            return proposals;
        }

        /// Switches only the entries listed, re-checking each match first so nothing changes
        /// from a stale preview.
        public async Task<RematchResult> ApplyAsync(IReadOnlyCollection<int> entryIds, CancellationToken cancellationToken)
        {
            var entries = await _db.CatalogEntries
                .Include(c => c.Format)
                .Where(c => entryIds.Contains(c.Id) && c.CreatedByUserId == null && OldSources.Contains(c.Source))
                .ToListAsync(cancellationToken);

            // Look everything up before touching the database, so no transaction stays open
            // while Wikidata is being called.
            var plan = new List<(CatalogEntry Entry, CatalogCandidate Match)>();
            var skipped = entryIds.Except(entries.Select(e => e.Id)).ToList();
            foreach (var entry in entries)
            {
                var (match, _) = await FindAsync(entry, cancellationToken);
                if (match == null)
                    skipped.Add(entry.Id);
                else
                    plan.Add((entry, match));
            }

            int switched = 0, merged = 0;
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            foreach (var (entry, match) in plan)
            {
                var existing = await _db.CatalogEntries.FirstOrDefaultAsync(c =>
                    c.Source == CatalogSources.Wikidata && c.ExternalId == match.ExternalId && c.FormatId == entry.FormatId && c.Id != entry.Id, cancellationToken);
                if (existing != null)
                {
                    // Someone already added the Wikidata version: move copies and wishlist
                    // entries onto it and retire the old entry.
                    await _db.Items.Where(i => i.CatalogEntryId == entry.Id)
                        .ExecuteUpdateAsync(s => s.SetProperty(i => i.CatalogEntryId, existing.Id), cancellationToken);
                    await _db.WishlistItems.Where(w => w.CatalogEntryId == entry.Id)
                        .ExecuteUpdateAsync(s => s.SetProperty(w => w.CatalogEntryId, existing.Id), cancellationToken);
                    _db.CatalogEntries.Remove(entry);
                    merged++;
                }
                else
                {
                    entry.Source = CatalogSources.Wikidata;
                    entry.ExternalId = match.ExternalId;
                    entry.Title = match.Title.Length > 200 ? match.Title[..200] : match.Title;
                    entry.ReleaseYear = match.ReleaseYear ?? entry.ReleaseYear;
                    entry.Creator = match.Creator;
                    entry.Description = match.Description;
                    // IGDB and TMDB covers are what their licences restrict, so they go too.
                    // Owners' own photos live on the item and aren't touched.
                    entry.CoverUrl = null;
                    switched++;
                }
            }
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new RematchResult(switched, merged, skipped);
        }

        private async Task<(CatalogCandidate? Match, string? Reason)> FindAsync(CatalogEntry entry, CancellationToken cancellationToken)
        {
            var results = await _metadata.SearchAsync(entry.Title, entry.Format, cancellationToken);
            var fromWikidata = results.Where(r => r.Source == CatalogSources.Wikidata).ToList();
            if (fromWikidata.Count == 0)
                return (null, "Wikidata had no results for this title");

            var title = Fold(entry.Title);
            var sameTitle = fromWikidata.Where(r => Fold(r.Title) == title).ToList();
            if (sameTitle.Count == 0)
                return (null, $"No exact title match (closest: {fromWikidata[0].Title})");

            var match = sameTitle.FirstOrDefault(r => entry.ReleaseYear == null || r.ReleaseYear == null || Math.Abs(r.ReleaseYear.Value - entry.ReleaseYear.Value) <= 1);
            return match == null
                ? (null, $"Same title, but released {sameTitle[0].ReleaseYear} instead of {entry.ReleaseYear}")
                : (match, null);
        }

        // Lowercase letters and digits only, with accents removed: "Pokémon" matches "Pokemon".
        private static string Fold(string title)
        {
            var decomposed = title.Normalize(NormalizationForm.FormD);
            var kept = decomposed.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark && char.IsLetterOrDigit(c));
            return new string(kept.Select(char.ToLowerInvariant).ToArray());
        }
    }
}
