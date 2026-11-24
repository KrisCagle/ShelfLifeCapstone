using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Games and movies from Wikidata. Its data is CC0 (public domain), so a paid app may use
    // it with no agreement, unlike TMDB and IGDB (see docs/DATA_SOURCES.md). It has no
    // barcodes and no usable cover art: scans still go barcode → product name → search,
    // and covers come from the owner's photo.
    //
    // Wikimedia asks apps to send a User-Agent with contact details (set Metadata:Contact),
    // make one request at a time, cache, and back off when told to. All of that happens here
    // or in MetadataService.
    public abstract partial class WikidataProvider : IMetadataProvider
    {
        private const string Api = "https://www.wikidata.org/w/api.php";
        private const string BlockedKey = "meta:wikidata:blocked";
        private static readonly TimeSpan DefaultBackOff = TimeSpan.FromMinutes(10);
        private static readonly TimeSpan MaxBackOff = TimeSpan.FromHours(1);

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly ILogger _logger;

        protected WikidataProvider(HttpClient http, IMemoryCache cache, ILogger logger)
        {
            _http = http;
            _cache = cache;
            _logger = logger;
        }

        public string Source => CatalogSources.Wikidata;
        public string DisplayName => "Wikidata";
        public abstract string MediaType { get; }

        // False while backing off, so nothing calls a server that asked us to wait.
        public bool IsConfigured => !_cache.TryGetValue(BlockedKey, out _);

        /// Whether an item is the kind of thing this provider looks for (a game, a film).
        protected abstract bool IsWanted(Entity item);

        /// The name on the box: publisher for games, studio for movies.
        protected abstract IEnumerable<string> CreatorIds(Entity item);

        /// Higher sorts first, after an exact title match.
        protected abstract int Fit(Entity item, Format format);

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            using var search = await GetJsonAsync(new()
            {
                ["action"] = "wbsearchentities",
                ["search"] = query,
                ["language"] = "en",
                ["type"] = "item",
                ["limit"] = "20",
            }, cancellationToken);
            if (search == null || !search.RootElement.TryGetProperty("search", out var hits))
                return [];
            var ids = hits.EnumerateArray().Select(h => h.GetProperty("id").GetString()!).ToList();
            if (ids.Count == 0)
                return [];

            var entities = await GetEntitiesAsync(ids, "labels|descriptions|claims|sitelinks", cancellationToken);
            var wanted = CatalogService.Normalize(query);
            var ranked = ids
                .Select((id, index) => (Item: entities.GetValueOrDefault(id), Index: index))
                .Where(x => x.Item != null && IsWanted(x.Item))
                .Select(x => (x.Item!, x.Index))
                .OrderByDescending(x => Fit(x.Item1, format))
                .ThenByDescending(x => CatalogService.Normalize(x.Item1.Label) == wanted)
                .ThenByDescending(x => x.Item1.Sitelinks)
                .ThenBy(x => x.Index)
                .Take(12)
                .Select(x => x.Item1)
                .ToList();

            var names = await LabelsAsync(ranked.SelectMany(i => CreatorIds(i).Take(1)), cancellationToken);
            return ranked.Select(i => ToCandidate(i, format, names)).ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!QidPattern().IsMatch(externalId))
                return null;
            var entities = await GetEntitiesAsync([externalId], "labels|descriptions|claims|sitelinks", cancellationToken);
            if (entities.GetValueOrDefault(externalId) is not { } item || !IsWanted(item))
                return null;
            var names = await LabelsAsync(CreatorIds(item).Take(1), cancellationToken);
            return ToCandidate(item, format, names);
        }

        private CatalogCandidate ToCandidate(Entity item, Format format, IReadOnlyDictionary<string, string> names)
        {
            var creator = CreatorIds(item).Select(id => names.GetValueOrDefault(id)).FirstOrDefault(n => n != null);
            var description = string.IsNullOrWhiteSpace(item.Description) ? null : char.ToUpperInvariant(item.Description[0]) + item.Description[1..];
            return new CatalogCandidate(Source, item.Id, item.Label, format.Id, item.Year, creator, null, Description: description);
        }

        private async Task<Dictionary<string, Entity>> GetEntitiesAsync(IReadOnlyCollection<string> ids, string props, CancellationToken cancellationToken)
        {
            using var doc = await GetJsonAsync(new()
            {
                ["action"] = "wbgetentities",
                ["ids"] = string.Join('|', ids.Take(50)),
                ["props"] = props,
                ["languages"] = "en",
                // Names that are the same in every language are stored once as "mul", and
                // only come back for "en" with fallback switched on.
                ["languagefallback"] = "1",
            }, cancellationToken);
            var result = new Dictionary<string, Entity>();
            if (doc == null || !doc.RootElement.TryGetProperty("entities", out var entities))
                return result;
            foreach (var entity in entities.EnumerateObject())
                if (Entity.From(entity.Value) is { } parsed)
                    result[entity.Name] = parsed;
            return result;
        }

        private async Task<IReadOnlyDictionary<string, string>> LabelsAsync(IEnumerable<string> ids, CancellationToken cancellationToken)
        {
            var unique = ids.Distinct().ToList();
            if (unique.Count == 0)
                return new Dictionary<string, string>();
            var entities = await GetEntitiesAsync(unique, "labels", cancellationToken);
            return entities.Where(e => e.Value.Label != e.Key).ToDictionary(e => e.Key, e => e.Value.Label);
        }

        // Throttling (429) and maxlag (503) both send Retry-After; honor it everywhere.
        private async Task<JsonDocument?> GetJsonAsync(Dictionary<string, string> query, CancellationToken cancellationToken)
        {
            query["format"] = "json";
            var url = $"{Api}?{string.Join('&', query.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"))}";
            using var response = await _http.GetAsync(url, cancellationToken);
            if (response.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable)
            {
                var wait = response.Headers.RetryAfter?.Delta ?? DefaultBackOff;
                wait = wait > MaxBackOff ? MaxBackOff : wait;
                _cache.Set(BlockedKey, true, wait);
                _logger.LogWarning("Wikidata asked us to slow down; pausing lookups for {Minutes:F0} minutes", wait.TotalMinutes);
                return null;
            }
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        }

        [GeneratedRegex(@"^Q\d+$")]
        private static partial Regex QidPattern();

        /// The parts of a Wikidata item this app uses.
        protected sealed class Entity
        {
            public required string Id { get; init; }
            public required string Label { get; init; }
            public string? Description { get; init; }
            public int? Year { get; init; }
            public int Sitelinks { get; init; }
            public required IReadOnlyDictionary<string, IReadOnlyList<string>> Links { get; init; }

            /// Item ids a property points at, e.g. P400 (platform) → consoles.
            public IReadOnlyList<string> Ids(string property) => Links.GetValueOrDefault(property) ?? [];

            public static Entity? From(JsonElement e)
            {
                if (e.TryGetProperty("missing", out _) || !e.TryGetProperty("id", out var id))
                    return null;
                var links = new Dictionary<string, IReadOnlyList<string>>();
                int? year = null;
                if (e.TryGetProperty("claims", out var claims))
                    foreach (var claim in claims.EnumerateObject())
                    {
                        var values = claim.Value.EnumerateArray()
                            .Select(c => c.TryGetProperty("mainsnak", out var snak) && snak.TryGetProperty("datavalue", out var dv) && dv.TryGetProperty("value", out var v) ? v : default)
                            .Where(v => v.ValueKind == JsonValueKind.Object)
                            .ToList();
                        if (claim.Name == "P577")
                            year = values.Select(v => v.TryGetProperty("time", out var t) && int.TryParse(t.GetString()?.Substring(1, 4), out var y) ? y : (int?)null).Min();
                        var ids = values.Select(v => v.TryGetProperty("id", out var target) ? target.GetString() : null).OfType<string>().ToList();
                        if (ids.Count > 0)
                            links[claim.Name] = ids;
                    }
                return new Entity
                {
                    Id = id.GetString()!,
                    Label = Text(e, "labels") ?? id.GetString()!,
                    Description = Text(e, "descriptions"),
                    Year = year,
                    Sitelinks = e.TryGetProperty("sitelinks", out var s) ? s.EnumerateObject().Count() : 0,
                    Links = links,
                };
            }

            private static string? Text(JsonElement e, string kind) =>
                e.TryGetProperty(kind, out var all) && all.TryGetProperty("en", out var en) && en.TryGetProperty("value", out var value) ? value.GetString() : null;
        }
    }

    public class WikidataGamesProvider : WikidataProvider
    {
        // Our formats → the console items Wikidata uses for "platform" (P400).
        private static readonly IReadOnlyDictionary<string, string> Platforms = new Dictionary<string, string>
        {
            ["NES"] = "Q172742",
            ["SNES"] = "Q183259",
            ["N64"] = "Q184839",
            ["PS1"] = "Q10677",
            ["PS2"] = "Q10680",
            ["PS3"] = "Q10683",
            ["PS4"] = "Q5014725",
            ["PS5"] = "Q63184502",
            ["GameBoy"] = "Q186437",
            ["GameBoy Advance"] = "Q188642",
            ["GameCube"] = "Q182172",
            ["Sega Genesis"] = "Q10676",
            ["Nintendo Switch"] = "Q19610114",
            ["Nintendo Switch 2"] = "Q122761124",
            ["Xbox 360"] = "Q48263",
            ["Xbox One"] = "Q13361286",
            ["Xbox Series X|S"] = "Q98973368",
            ["Wii"] = "Q8079",
            ["Wii U"] = "Q56942",
            ["Nintendo DS"] = "Q170323",
            ["Nintendo 3DS"] = "Q203597",
        };

        private const string VideoGame = "Q7889";

        public WikidataGamesProvider(HttpClient http, IMemoryCache cache, ILogger<WikidataGamesProvider> logger) : base(http, cache, logger) { }

        public override string MediaType => MediaTypes.Games;

        // Series and franchises aren't something you can own a copy of, and neither is a
        // stub with no platform or release date. A stub called just "Chakan" matched a barcode
        // scan exactly and beat Chakan: The Forever Man.
        protected override bool IsWanted(Entity item)
        {
            var description = item.Description ?? string.Empty;
            if (description.Contains("series") || description.Contains("franchise"))
                return false;
            if (item.Year == null && item.Ids("P400").Count == 0)
                return false;
            return item.Ids("P31").Contains(VideoGame) || description.Contains("video game");
        }

        // Publisher, else developer.
        protected override IEnumerable<string> CreatorIds(Entity item) => item.Ids("P123").Concat(item.Ids("P178"));

        // Being on the console you picked beats an exact title: a stub item named "Chakan"
        // with no platform shouldn't outrank Chakan: The Forever Man on Genesis.
        protected override int Fit(Entity item, Format format) =>
            Platforms.TryGetValue(format.Name, out var platform) && item.Ids("P400").Contains(platform) ? 1 : 0;
    }

    public partial class WikidataMoviesProvider : WikidataProvider
    {
        private static readonly HashSet<string> Films = ["Q11424", "Q29168811", "Q506240", "Q202866", "Q24862"];

        public WikidataMoviesProvider(HttpClient http, IMemoryCache cache, ILogger<WikidataMoviesProvider> logger) : base(http, cache, logger) { }

        public override string MediaType => MediaTypes.Movies;

        protected override bool IsWanted(Entity item)
        {
            var description = item.Description ?? string.Empty;
            if (description.Contains("series") || description.Contains("franchise"))
                return false;
            return item.Ids("P31").Any(Films.Contains) || FilmWord().IsMatch(description);
        }

        // Production company, else director.
        protected override IEnumerable<string> CreatorIds(Entity item) => item.Ids("P272").Concat(item.Ids("P57"));

        // On VHS, films from the tape era (production ended around 2006) before later remakes.
        protected override int Fit(Entity item, Format format) =>
            format.Name == "VHS" && item.Year is int year && year <= 2006 ? 1 : 0;

        [GeneratedRegex(@"\bfilm\b")]
        private static partial Regex FilmWord();
    }
}
