using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Comic issues from the Grand Comics Database, a volunteer project. Its data is
    // CC BY-SA 4.0, so the app credits it, and shared data built from it stays under that
    // licence. Its covers aren't part of that, so they aren't used: people add their own.
    //
    // The API allows anonymous use for now but warns that may end and that its fields can
    // change. Any failure here just means no results, and manual entry still works.
    //
    // Its anonymous limit is small, and every user of this app shares it because requests
    // come from one server. Going live needs an account or GCD's data downloads.
    public partial class GcdProvider : IMetadataProvider
    {
        private const string Api = "https://www.comics.org/api";

        // Series searches return 50 results a page in alphabetical order, so a common word
        // can match for many pages. Three keeps one search from being a burst of requests.
        private const int MaxPages = 3;

        private const string BlockedKey = "meta:gcd:blocked";
        private static readonly TimeSpan DefaultBackOff = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan MaxBackOff = TimeSpan.FromHours(1);

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly ILogger<GcdProvider> _logger;

        public GcdProvider(HttpClient http, IMemoryCache cache, ILogger<GcdProvider> logger)
        {
            _http = http;
            _cache = cache;
            _logger = logger;
        }

        public string Source => CatalogSources.Gcd;
        public string DisplayName => "Grand Comics Database";
        public string MediaType => MediaTypes.Comics;

        // Reports false while backing off, so nothing calls a server that asked us to stop.
        public bool IsConfigured => !_cache.TryGetValue(BlockedKey, out _);

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            // "Saga 12" or "Saga #12". With no number, start from each series' first issue.
            var match = SeriesAndIssue().Match(query.Trim());
            var series = match.Success ? match.Groups[1].Value.Trim() : query.Trim();
            var number = match.Success ? match.Groups[2].Value : "1";
            if (series.Length < 2)
                return [];

            // A slash would be read as part of the URL path ("Batman/Superman").
            var name = Uri.EscapeDataString(series.Replace('/', ' '));
            var wanted = CatalogService.Normalize(series);
            var found = new List<(CatalogCandidate Issue, string Series, bool IsVariant)>();
            for (var page = 1; page <= MaxPages; page++)
            {
                using var doc = await GetJsonAsync($"{Api}/series/name/{name}/issue/{number}/?format=json&page={page}", cancellationToken);
                if (doc == null || !doc.RootElement.TryGetProperty("results", out var results))
                    break;
                foreach (var issue in results.EnumerateArray())
                    if (FromListing(issue, format.Id) is { } listing)
                        found.Add(listing);
                // Finding the exact series means more pages can't improve the answer.
                if (found.Any(f => IsSameSeries(f.Series, wanted)))
                    break;
                if (!doc.RootElement.TryGetProperty("next", out var next) || next.ValueKind == JsonValueKind.Null)
                    break;
            }

            // Results are alphabetical, so rank them: the exact series, then titles that start
            // with the search, then main editions ahead of their variants.
            return found
                .OrderByDescending(f => IsSameSeries(f.Series, wanted))
                .ThenByDescending(f => CatalogService.Normalize(f.Series).StartsWith(wanted))
                .ThenBy(f => f.IsVariant)
                .Take(12)
                .Select(f => f.Issue)
                .ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!long.TryParse(externalId, out var id))
                return null;
            using var doc = await GetJsonAsync($"{Api}/issue/{id}/?format=json", cancellationToken);
            if (doc == null || FromListing(doc.RootElement, format.Id) is not { } listing)
                return null;

            var issue = doc.RootElement;
            var story = MainStory(issue);

            // A variant (Newsstand, a second cover) holds no stories of its own; it's the same
            // comic as the issue it points at.
            using var parent = story.ValueKind == JsonValueKind.Undefined && IssueId().Match(Text(issue, "variant_of") ?? string.Empty) is { Success: true } link
                ? await GetJsonAsync($"{Api}/issue/{link.Groups[1].Value}/?format=json", cancellationToken)
                : null;
            if (parent != null)
                story = MainStory(parent.RootElement);

            var creator = CleanCredit(Text(story, "script")) ?? Text(issue, "indicia_publisher");
            return listing.Issue with { Creator = creator, Description = Text(story, "synopsis") };
        }

        private static JsonElement MainStory(JsonElement issue) =>
            issue.TryGetProperty("story_set", out var stories)
                ? stories.EnumerateArray().FirstOrDefault(s => Text(s, "type") == "comic story")
                : default;

        private (CatalogCandidate Issue, string Series, bool IsVariant)? FromListing(JsonElement issue, int formatId)
        {
            var id = IssueId().Match(Text(issue, "api_url") ?? string.Empty);
            var seriesName = Text(issue, "series_name");
            var descriptor = Text(issue, "descriptor");
            if (!id.Success || seriesName == null || descriptor == null)
                return null;

            var series = SeriesYear().Replace(seriesName, string.Empty).Trim();
            // Several series can share a name, and collectors tell them apart by start year
            // ("Amazing Spider-Man (1963)"). The writer replaces this once the issue is saved.
            var started = SeriesYear().Match(seriesName) is { Success: true } m ? $"{m.Groups[1].Value} series" : null;
            var date = Text(issue, "publication_date");
            var year = date != null && Year().Match(date) is { Success: true } y ? int.Parse(y.Value) : (int?)null;
            var isVariant = issue.TryGetProperty("variant_of", out var parent) && parent.ValueKind != JsonValueKind.Null;
            return (new CatalogCandidate(Source, id.Groups[1].Value, $"{series} #{descriptor}", formatId, year, started, null), series, isVariant);
        }

        private static bool IsSameSeries(string series, string wanted)
        {
            var name = CatalogService.Normalize(series);
            return name == wanted || name == $"the {wanted}";
        }

        // Credits carry notes ("Stan Lee (plot); Gerry Conway [as G.C.]"); only the first name fits here.
        private static string? CleanCredit(string? credit)
        {
            var first = credit?.Split(';')[0];
            var name = first == null ? null : CreditNote().Replace(first, string.Empty).Trim();
            return string.IsNullOrEmpty(name) || name == "?" ? null : name;
        }

        private static string? Text(JsonElement element, string property) =>
            element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString())
                ? value.GetString()
                : null;

        // A 404 means no such issue, which isn't a failure. A 429 keeps any pages already
        // read, and stops all requests for as long as the server asks.
        private async Task<JsonDocument?> GetJsonAsync(string url, CancellationToken cancellationToken)
        {
            using var response = await _http.GetAsync(url, cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
                return null;
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var wait = response.Headers.RetryAfter?.Delta ?? DefaultBackOff;
                wait = wait > MaxBackOff ? MaxBackOff : wait;
                _cache.Set(BlockedKey, true, wait);
                _logger.LogWarning("Grand Comics Database rate limit reached; pausing lookups for {Minutes:F0} minutes", wait.TotalMinutes);
                return null;
            }
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        }

        [GeneratedRegex(@"^(.*\S)\s+#?(\d+)$")]
        private static partial Regex SeriesAndIssue();

        [GeneratedRegex(@"/issue/(\d+)/")]
        private static partial Regex IssueId();

        [GeneratedRegex(@"\s*\((\d{4}) series\)$")]
        private static partial Regex SeriesYear();

        [GeneratedRegex(@"\b(1[89]\d{2}|20\d{2})\b")]
        private static partial Regex Year();

        [GeneratedRegex(@"\s*[\(\[].*$")]
        private static partial Regex CreditNote();
    }
}
