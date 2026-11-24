using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;

namespace ShelfLifeAPI.Services.Market
{
    /// What collectors paid for a title.
    /// <param name="Collectors">How many people have logged a price for it.</param>
    /// <param name="Low">The 25th percentile; only set once enough people have.</param>
    /// <param name="Typical">The median; only set once enough people have.</param>
    /// <param name="High">The 75th percentile; only set once enough people have.</param>
    public record PaidSummary(int Collectors, int Needed, decimal? Low, decimal? Typical, decimal? High);

    public record ItemTypical(int ItemId, decimal Typical);

    /// Price ranges built from purchase prices people log in ShelfLife: our own data, so no
    /// outside license applies. Privacy rules:
    ///  * Only shared catalog entries. A private, hand-typed title is never pooled.
    ///  * Nothing is shown until enough different people have logged a price, so no one's
    ///    price can be picked out, and each person counts once however many copies they own.
    ///  * Only a range and a median come back, never individual prices.
    public class CollectorsPaid
    {
        private readonly ShelfLifeDbContext _db;
        private readonly int _minimum;

        public CollectorsPaid(ShelfLifeDbContext db, IConfiguration configuration)
        {
            _db = db;
            _minimum = Math.Max(3, configuration.GetValue("Market:MinCollectors", 5));
        }

        public async Task<PaidSummary?> ForEntryAsync(int catalogEntryId, CancellationToken cancellationToken)
        {
            var shared = await _db.CatalogEntries.AnyAsync(c => c.Id == catalogEntryId && c.CreatedByUserId == null, cancellationToken);
            if (!shared)
                return null;

            var perPerson = await PerPersonPrices(_db.Items.Where(i => i.CatalogEntryId == catalogEntryId)).ToListAsync(cancellationToken);
            return Summarize(perPerson.Select(p => p.Price).ToList());
        }

        /// The typical price for each of this user's items that has enough data.
        public async Task<IReadOnlyList<ItemTypical>> ForCollectionAsync(string userId, CancellationToken cancellationToken)
        {
            var mine = await _db.Items
                .Where(i => i.UserId == userId && i.CatalogEntry.CreatedByUserId == null)
                .Select(i => new { i.Id, i.CatalogEntryId })
                .ToListAsync(cancellationToken);
            var entryIds = mine.Select(i => i.CatalogEntryId).Distinct().ToList();

            var prices = await PerPersonPrices(_db.Items.Where(i => entryIds.Contains(i.CatalogEntryId)))
                .ToListAsync(cancellationToken);
            var typical = prices
                .GroupBy(p => p.CatalogEntryId)
                .Select(g => (Entry: g.Key, Summary: Summarize(g.Select(p => p.Price).ToList())))
                .Where(x => x.Summary.Typical != null)
                .ToDictionary(x => x.Entry, x => x.Summary.Typical!.Value);

            return mine.Where(i => typical.ContainsKey(i.CatalogEntryId)).Select(i => new ItemTypical(i.Id, typical[i.CatalogEntryId])).ToList();
        }

        // One price per person per title: the average of their copies. Free copies (gifts,
        // "found it in the attic") aren't a price, so they're left out.
        private IQueryable<PersonPrice> PerPersonPrices(IQueryable<Models.Item> items) =>
            items
                .Where(i => i.PurchasePrice > 0 && i.CatalogEntry.CreatedByUserId == null)
                .GroupBy(i => new { i.CatalogEntryId, i.UserId })
                .Select(g => new PersonPrice(g.Key.CatalogEntryId, g.Average(i => i.PurchasePrice)));

        private record PersonPrice(int CatalogEntryId, decimal Price);

        private PaidSummary Summarize(IReadOnlyList<decimal> perPerson)
        {
            if (perPerson.Count < _minimum)
                return new PaidSummary(perPerson.Count, _minimum, null, null, null);
            var sorted = perPerson.OrderBy(p => p).ToList();
            return new PaidSummary(sorted.Count, _minimum, Percentile(sorted, 0.25), Percentile(sorted, 0.5), Percentile(sorted, 0.75));
        }

        // Linear interpolation between the two nearest values.
        private static decimal Percentile(IReadOnlyList<decimal> sorted, double p)
        {
            var rank = p * (sorted.Count - 1);
            var lower = (int)Math.Floor(rank);
            var upper = (int)Math.Ceiling(rank);
            var value = sorted[lower] + (sorted[upper] - sorted[lower]) * (decimal)(rank - lower);
            return Math.Round(value, 2);
        }
    }
}
