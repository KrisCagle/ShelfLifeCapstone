using System.Text.Json;
using System.Text.RegularExpressions;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Music metadata from MusicBrainz (free, no key) with covers from the Cover Art Archive.
    // MusicBrainz asks for a descriptive User-Agent and at most ~1 request per second.
    public partial class MusicBrainzProvider : IMetadataProvider, IBarcodeProvider
    {
        private const string Api = "https://musicbrainz.org/ws/2";
        private static readonly SemaphoreSlim Throttle = new(1, 1);
        private static DateTime _lastCall = DateTime.MinValue;

        private readonly HttpClient _http;

        public MusicBrainzProvider(HttpClient http) => _http = http;

        public string Source => CatalogSources.MusicBrainz;
        public string DisplayName => "MusicBrainz";
        public string MediaType => MediaTypes.Music;
        public bool IsConfigured => true;

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            var escaped = LuceneSpecial().Replace(query.Trim(), @"\$1");
            using var doc = await GetJsonAsync($"{Api}/release-group/?query={Uri.EscapeDataString(escaped)}&limit=100&fmt=json", cancellationToken);
            if (doc == null || !doc.RootElement.TryGetProperty("release-groups", out var groups))
                return [];

            // Ranking, best first:
            // 1. the title is made of the searched words and any leftover words are the artist
            //    ("rumours fleetwood mac" → Rumours by Fleetwood Mac, not "Plays Fleetwood Mac's Rumours");
            // 2. more of the words the title doesn't cover matched the artist ("thriller michael
            //    jackson" → the album by Michael Jackson, not a book titled "Michael Jackson – Thriller";
            //    "rumours fleetwood mac" → Rumours, not the "Fleetwood Mac / Rumours" box set);
            // 3. MusicBrainz's own score, for partial matches only;
            // 4. number of releases: of the many albums called "Kind of Blue", the one with
            //    hundreds of pressings is the one people mean.
            var words = Words(query);
            return groups.EnumerateArray()
                .Where(g => g.TryGetProperty("score", out var s) && s.GetInt32() >= 60)
                .Select(g => new
                {
                    Group = g,
                    Title = Words(g.GetProperty("title").GetString() ?? ""),
                    Artist = Words(Artists(g) ?? ""),
                })
                .Select(x => new
                {
                    x.Group,
                    x.Title,
                    x.Artist,
                    Full = x.Title.All(words.Contains) && words.All(w => x.Title.Contains(w) || x.Artist.Contains(w)),
                })
                .OrderByDescending(x => x.Full)
                .ThenByDescending(x => words.Count(w => !x.Title.Contains(w) && x.Artist.Contains(w)))
                // Text score only matters for partial matches; a leading "The" shouldn't sink
                // Pink Floyd's "The Dark Side of the Moon" below lesser-known exact-title albums.
                .ThenByDescending(x => x.Full ? 0 : x.Group.GetProperty("score").GetInt32() / 10)
                .ThenByDescending(x => x.Group.TryGetProperty("count", out var c) ? c.GetInt32() : 0)
                .Take(12)
                .Select(x => FromReleaseGroup(x.Group, format.Id))
                .ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(externalId, out _))
                return null;
            using var doc = await GetJsonAsync($"{Api}/release-group/{externalId}?inc=artist-credits&fmt=json", cancellationToken);
            return doc == null ? null : FromReleaseGroup(doc.RootElement, format.Id);
        }

        public async Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken)
        {
            using var doc = await GetJsonAsync($"{Api}/release/?query=barcode:{barcode}&limit=10&fmt=json", cancellationToken);
            if (doc == null || !doc.RootElement.TryGetProperty("releases", out var releases))
                return [];

            // Search is fuzzy; keep exact barcode matches only. Bootlegs often reuse a real
            // release's barcode, so official releases win when there are any.
            var exact = releases.EnumerateArray()
                .Where(r => r.TryGetProperty("barcode", out var b) && b.GetString() == barcode)
                .Where(r => r.TryGetProperty("release-group", out _))
                .ToList();
            static bool Official(JsonElement r) => r.TryGetProperty("status", out var s) && s.GetString() == "Official";
            if (exact.Any(Official))
                exact = exact.Where(Official).ToList();

            return exact
                .Select(r =>
                {
                    var group = r.GetProperty("release-group");
                    var mediaFormat = r.TryGetProperty("media", out var media)
                        ? media.EnumerateArray().Select(m => m.TryGetProperty("format", out var f) ? f.GetString() : null).FirstOrDefault(f => f != null)
                        : null;
                    var format = FormatFor(mediaFormat, formats);
                    return new CatalogCandidate(
                        Source,
                        group.GetProperty("id").GetString()!,
                        r.GetProperty("title").GetString()!,
                        format?.Id,
                        Year(r, "date"),
                        Artists(r),
                        CoverUrl(group.GetProperty("id").GetString()!),
                        barcode);
                })
                .DistinctBy(c => (c.ExternalId, c.FormatId))
                .ToList();
        }

        private static Format? FormatFor(string? mediaFormat, IReadOnlyList<Format> formats)
        {
            if (mediaFormat == null) return null;
            var name = mediaFormat.Contains("Vinyl", StringComparison.OrdinalIgnoreCase) ? "Vinyl"
                : mediaFormat.Contains("CD", StringComparison.OrdinalIgnoreCase) ? "CD"
                : null;
            return formats.FirstOrDefault(f => f.Name == name);
        }

        private CatalogCandidate FromReleaseGroup(JsonElement g, int formatId)
        {
            var id = g.GetProperty("id").GetString()!;
            return new CatalogCandidate(Source, id, g.GetProperty("title").GetString()!, formatId,
                Year(g, "first-release-date"), Artists(g), CoverUrl(id));
        }

        // The Cover Art Archive redirects to the image; albums without art return 404
        // and the client falls back to generated box art.
        private static string CoverUrl(string releaseGroupId) =>
            $"https://coverartarchive.org/release-group/{releaseGroupId}/front-250";

        private static int? Year(JsonElement e, string property) =>
            e.TryGetProperty(property, out var d) && d.GetString() is { Length: >= 4 } date && int.TryParse(date[..4], out var y) ? y : null;

        private static string? Artists(JsonElement e) =>
            e.TryGetProperty("artist-credit", out var credits)
                ? string.Join(", ", credits.EnumerateArray().Select(a => a.GetProperty("name").GetString()))
                : null;

        private async Task<JsonDocument?> GetJsonAsync(string url, CancellationToken cancellationToken)
        {
            await Throttle.WaitAsync(cancellationToken);
            try
            {
                // One retry when MusicBrainz says we're going too fast (503).
                for (var attempt = 0; ; attempt++)
                {
                    var wait = _lastCall.AddMilliseconds(attempt == 0 ? 1100 : 2000) - DateTime.UtcNow;
                    if (wait > TimeSpan.Zero)
                        await Task.Delay(wait, cancellationToken);
                    _lastCall = DateTime.UtcNow;

                    using var response = await _http.GetAsync(url, cancellationToken);
                    if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable && attempt == 0)
                        continue;
                    if (!response.IsSuccessStatusCode)
                        return null;
                    return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                }
            }
            finally
            {
                Throttle.Release();
            }
        }

        private static HashSet<string> Words(string text) =>
            WordPattern().Matches(text.ToLowerInvariant()).Select(m => m.Value).ToHashSet();

        [GeneratedRegex(@"([+\-!(){}\[\]^""~*?:\\/]|&&|\|\|)")]
        private static partial Regex LuceneSpecial();

        [GeneratedRegex(@"[\p{L}\p{N}]+")]
        private static partial Regex WordPattern();
    }
}
