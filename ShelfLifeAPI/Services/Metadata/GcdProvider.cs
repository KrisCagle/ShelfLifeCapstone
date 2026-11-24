using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Comic issues from ShelfLife's own copy of the Grand Comics Database, imported from its
    // data dump by tools/GcdImport (docs/DATA_SOURCES.md, Phase B). Reading our own tables
    // means no rate limit, no outside call, and no dependence on GCD's API staying open.
    //
    // The data is CC BY-SA 4.0. GCD asks for a credit on every page showing its data (the
    // site footer) and a link to the relevant GCD page for each record listed, which the
    // app builds from the issue id in ExternalId: https://www.comics.org/issue/{id}/.
    // GCD's covers aren't part of that licence and aren't imported: people add their own.
    public partial class GcdProvider : IMetadataProvider, IBarcodeProvider
    {
        private const int Limit = 12;

        private readonly ShelfLifeDbContext _db;

        public GcdProvider(ShelfLifeDbContext db) => _db = db;

        public string Source => CatalogSources.Gcd;
        public string DisplayName => "Grand Comics Database";
        public string MediaType => MediaTypes.Comics;
        public bool IsConfigured => true;

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            // "Saga 12" or "Saga #12". Without a number, each series' first issue stands in for it.
            var match = SeriesAndIssue().Match(query.Trim());
            var name = (match.Success ? match.Groups[1].Value : query).Trim();
            var number = match.Success ? match.Groups[2].Value : null;
            if (name.Length < 2)
                return [];

            // Word by word, ignoring punctuation and spacing: "batman/superman" also finds
            // "Batman / Superman".
            var words = Words().Matches(name.ToLowerInvariant()).Select(m => m.Value).ToList();
            if (words.Count == 0)
                return [];
            var pattern = $"%{string.Join('%', words.Select(EscapeLike))}%";
            var key = string.Concat(words);
            var series = await _db.ComicSeries
                .Where(s => EF.Functions.ILike(s.Name, pattern, "\\"))
                // The exact series first, then names that start with the search, then English
                // editions, then the longest runs: "saga" should find Saga, not Batman Saga.
                .OrderByDescending(s => s.NameKey == key || s.NameKey == "the" + key)
                .ThenByDescending(s => s.NameKey.StartsWith(key) || s.NameKey.StartsWith("the" + key))
                .ThenByDescending(s => s.Language == "en")
                .ThenByDescending(s => s.IssueCount)
                .Take(30)
                .ToListAsync(cancellationToken);
            if (series.Count == 0)
                return [];

            var rank = series.Select((s, i) => (s.Id, i)).ToDictionary(x => x.Id, x => x.i);
            var ids = series.Select(s => s.Id).ToList();
            var firstIssues = series.Select(s => s.FirstIssueId).OfType<int>().ToList();
            var issues = await _db.ComicIssues
                .Include(i => i.Series)
                .Where(i => ids.Contains(i.SeriesId) && (number != null ? i.Number == number : firstIssues.Contains(i.Id)))
                .ToListAsync(cancellationToken);

            return issues
                .OrderBy(i => rank[i.SeriesId])
                .ThenBy(i => i.VariantOfId != null)
                .ThenBy(i => i.Id)
                .Take(Limit)
                .Select(i => ToCandidate(i, format.Id))
                .ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!int.TryParse(externalId, out var id))
                return null;
            var issue = await _db.ComicIssues.Include(i => i.Series).FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
            return issue == null ? null : ToCandidate(issue, format.Id);
        }

        /// A comic's barcode. With the 5-digit add-on it names the exact issue; without it,
        /// only the series, so the series' issues come back newest first to choose from.
        /// ISBNs find trade paperbacks and graphic novels.
        public async Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken)
        {
            var isIsbn = OpenLibraryProvider.IsIsbn(barcode);
            var issues = isIsbn
                ? await Issues(i => i.Isbn == barcode, cancellationToken)
                : await Issues(i => i.Barcode == barcode, cancellationToken);
            if (issues.Count == 0 && !isIsbn)
                issues = await Issues(i => i.BarcodeMain == barcode, cancellationToken);

            var formatName = isIsbn ? "Trade Paperback" : "Single Issue";
            var formatId = formats.FirstOrDefault(f => f.Name == formatName)?.Id;
            return issues.Select(i => ToCandidate(i, formatId) with { Barcode = barcode }).ToList();
        }

        private Task<List<ComicIssue>> Issues(System.Linq.Expressions.Expression<Func<ComicIssue, bool>> where, CancellationToken cancellationToken) =>
            _db.ComicIssues
                .Include(i => i.Series)
                .Where(where)
                .OrderByDescending(i => i.Year)
                .ThenBy(i => i.VariantOfId != null)
                .Take(Limit)
                .ToListAsync(cancellationToken);

        // "The Amazing Spider-Man (1963) #300 [Newsstand]": the start year tells same-named
        // series apart, and Direct and Newsstand editions are collected separately.
        private CatalogCandidate ToCandidate(ComicIssue issue, int? formatId)
        {
            var year = issue.Series.YearBegan is int began ? $" ({began})" : "";
            var variant = issue.VariantName is { } v ? $" [{v}]" : "";
            var title = $"{issue.Series.Name}{year} #{issue.Number}{variant}";
            if (title.Length > 200)
                title = title[..200];
            return new CatalogCandidate(Source, issue.Id.ToString(), title, formatId, issue.Year ?? issue.Series.YearBegan, issue.Series.Publisher, null,
                Description: issue.Title);
        }

        private static string EscapeLike(string value) => value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

        [GeneratedRegex(@"[\p{L}\p{N}]+")]
        private static partial Regex Words();

        [GeneratedRegex(@"^(.*\S)\s+#?(\d+[A-Za-z]?)$")]
        private static partial Regex SeriesAndIssue();
    }
}
