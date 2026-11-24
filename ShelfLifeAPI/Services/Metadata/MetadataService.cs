using Microsoft.Extensions.Caching.Memory;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    public record ProviderInfo(string Source, string Name, string MediaType, bool Configured);

    // Routes lookups to the right source for a format and caches everything:
    // metadata changes rarely, and free APIs have tight rate limits.
    public class MetadataService
    {
        private static readonly TimeSpan SearchTtl = TimeSpan.FromHours(6);
        private static readonly TimeSpan RecordTtl = TimeSpan.FromHours(24);

        private readonly IEnumerable<IMetadataProvider> _providers;
        private readonly MusicBrainzProvider _musicBrainz;
        private readonly OpenLibraryProvider _openLibrary;
        private readonly GcdProvider _gcd;
        private readonly UpcItemDbProvider _upc;
        private readonly EbayBarcodeProvider _ebay;
        private readonly IMemoryCache _cache;
        private readonly ILogger<MetadataService> _logger;
        private readonly bool _ebayFallback;
        private readonly IConfiguration _configuration;

        public MetadataService(IEnumerable<IMetadataProvider> providers, MusicBrainzProvider musicBrainz, OpenLibraryProvider openLibrary, GcdProvider gcd, UpcItemDbProvider upc, EbayBarcodeProvider ebay,
            IMemoryCache cache, ILogger<MetadataService> logger, IConfiguration configuration)
        {
            _providers = providers;
            _musicBrainz = musicBrainz;
            _openLibrary = openLibrary;
            _gcd = gcd;
            _upc = upc;
            _ebay = ebay;
            _cache = cache;
            _logger = logger;
            // Using eBay listings as a product database is outside what its license
            // describes, so this is for local testing only (see docs/DATA_SOURCES.md).
            _ebayFallback = configuration.GetValue("Metadata:EbayBarcodeFallback", false);
            _configuration = configuration;
        }

        public IEnumerable<ProviderInfo> Providers =>
            _providers.Select(p => new ProviderInfo(p.Source, p.DisplayName, p.MediaType, p.IsConfigured));

        // Which source a media type uses comes from Metadata:Providers:<MediaType>, so the public
        // app can use sources a paid product may use (Wikidata) while IGDB or TMDB stay one
        // setting away, for local testing or once there's a commercial agreement.
        private string? PreferredSource(string mediaType) => _configuration[$"Metadata:Providers:{mediaType}"];

        private IMetadataProvider? ChosenFor(Format format)
        {
            var preferred = PreferredSource(format.MediaType);
            var forMedia = _providers.Where(p => p.MediaType == format.MediaType);
            return preferred != null ? forMedia.FirstOrDefault(p => p.Source == preferred) : forMedia.FirstOrDefault();
        }

        private IMetadataProvider? ProviderFor(Format format) => ChosenFor(format) is { IsConfigured: true } provider ? provider : null;

        /// What a format's search uses, even while it's unavailable, so the app can say so.
        public ProviderInfo? InfoFor(Format format) =>
            ChosenFor(format) is { } p ? new ProviderInfo(p.Source, p.DisplayName, p.MediaType, p.IsConfigured) : null;

        // Wikidata serves two media types with one source name, so the format picks between them.
        private IMetadataProvider? ProviderFor(string source, Format format) =>
            _providers.FirstOrDefault(p => p.Source == source && p.MediaType == format.MediaType && p.IsConfigured);

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            var provider = ProviderFor(format);
            if (provider == null || query.Trim().Length < 2)
                return [];

            // Game search filters by platform and movie search ranks by format (tape era), so
            // those are cached per format. An album search is the same for CD and vinyl, so
            // those share one cache entry and just get re-tagged with the format.
            var scope = provider.Source is CatalogSources.Igdb or CatalogSources.Tmdb ? format.Id.ToString() : provider.MediaType;
            var key = $"meta:search:{provider.Source}:{scope}:{query.Trim().ToLowerInvariant()}";
            if (!_cache.TryGetValue(key, out IReadOnlyList<CatalogCandidate>? results) || results == null)
            {
                results = await SafeAsync(() => provider.SearchAsync(query.Trim(), format, cancellationToken), provider.DisplayName) ?? [];
                // An empty answer is often a hiccup (rate limit, timeout); don't remember it for long.
                _cache.Set(key, results, results.Count > 0 ? SearchTtl : TimeSpan.FromMinutes(1));
            }

            var tagged = results.Select(r => r with { FormatId = format.Id }).ToList();
            Remember(tagged);
            return tagged;
        }

        /// One record by source id, from cache when it was just shown in search results.
        public async Task<CatalogCandidate?> GetAsync(string source, string externalId, Format format, CancellationToken cancellationToken)
        {
            if (_cache.TryGetValue(RecordKey(source, externalId, format.Id), out CatalogCandidate? cached))
                return cached;
            var provider = ProviderFor(source, format);
            if (provider == null)
                return null;

            var record = await SafeAsync(() => provider.GetAsync(externalId, format, cancellationToken), provider.DisplayName);
            if (record != null)
                Remember([record]);
            return record;
        }

        /// Barcode → candidates. ISBNs resolve exactly through Open Library and music barcodes
        /// through MusicBrainz; anything else goes through a generic product lookup whose
        /// cleaned-up name is then searched in the right metadata source. The raw product
        /// match is kept as a fallback.
        public async Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken)
        {
            var key = $"meta:barcode:{barcode}";
            if (_cache.TryGetValue(key, out IReadOnlyList<CatalogCandidate>? cached) && cached != null)
                return cached;

            // Comics come from ShelfLife's own copy of the GCD, so checking them costs no
            // outside call. An ISBN can be a book or a trade paperback, so it asks both.
            var results = new List<CatalogCandidate>(await _gcd.LookupBarcodeAsync(barcode, formats, cancellationToken));
            // An ISBN is never a record, so don't spend MusicBrainz's strict rate limit on it.
            var exact = OpenLibraryProvider.IsIsbn(barcode)
                ? await SafeAsync(() => _openLibrary.LookupBarcodeAsync(barcode, formats, cancellationToken), "Open Library")
                : results.Count > 0
                    ? null
                    : await SafeAsync(() => _musicBrainz.LookupBarcodeAsync(barcode, formats, cancellationToken), "MusicBrainz");
            results.AddRange(exact ?? []);

            if (results.Count == 0)
            {
                var products = await SafeAsync(() => _upc.LookupBarcodeAsync(barcode, formats, cancellationToken), "UPCitemdb") ?? [];
                if (products.Count == 0 && _ebayFallback)
                    products = await SafeAsync(() => _ebay.LookupBarcodeAsync(barcode, formats, cancellationToken), "eBay") ?? [];
                foreach (var product in products)
                {
                    var format = formats.FirstOrDefault(f => f.Id == product.FormatId);
                    if (format == null)
                    {
                        results.Add(product);
                        continue;
                    }

                    // Retail names trail extra words ("Earthbound Rpg"); if the full name finds
                    // nothing, drop words from the end until something matches.
                    var words = product.Title.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
                    IReadOnlyList<CatalogCandidate> matches = [];
                    for (var take = words.Count; take >= 1 && take > words.Count - 3 && matches.Count == 0; take--)
                        matches = await SearchAsync(string.Join(' ', words.Take(take)), format, cancellationToken);

                    // A barcode is one product: an exact title is the answer on its own, and
                    // the raw retail listing is only a fallback when nothing matched.
                    var exactTitle = matches.Where(m => CatalogService.Normalize(m.Title) == CatalogService.Normalize(product.Title)).Take(1).ToList();
                    var best = exactTitle.Count > 0 ? exactTitle : matches.Take(2).ToList();
                    results.AddRange(best.Select(m => m with { Barcode = barcode }));
                    if (best.Count == 0)
                        results.Add(product);
                }
            }

            _logger.LogInformation("Barcode {Barcode}: {Count} result(s): {Results}", barcode, results.Count,
                string.Join(" | ", results.Select(r => $"[{r.Source}] {r.Title} (format {r.FormatId?.ToString() ?? "?"})")));
            Remember(results);
            _cache.Set(key, (IReadOnlyList<CatalogCandidate>)results, results.Count > 0 ? RecordTtl : TimeSpan.FromMinutes(10));
            return results;
        }

        // Search results from TMDB lack the studio, and those from Open Library lack the
        // description, which only their detail calls return. Those records are
        // fetched fresh when saved instead of reused from a search; a book from a barcode
        // lookup is already complete.
        private void Remember(IEnumerable<CatalogCandidate> candidates)
        {
            foreach (var c in candidates.Where(c => c.FormatId != null && IsComplete(c)))
                _cache.Set(RecordKey(c.Source, c.ExternalId, c.FormatId!.Value), c, RecordTtl);
        }

        private static bool IsComplete(CatalogCandidate c) => c.Source switch
        {
            CatalogSources.Upc or CatalogSources.Tmdb => false,
            CatalogSources.OpenLibrary => c.Barcode != null,
            _ => true,
        };

        private static string RecordKey(string source, string externalId, int formatId) => $"meta:record:{source}:{externalId}:{formatId}";

        // A metadata source being down should degrade to "no results", never a 500.
        private async Task<T?> SafeAsync<T>(Func<Task<T>> call, string name) where T : class?
        {
            try
            {
                return await call();
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException or KeyNotFoundException or InvalidOperationException)
            {
                _logger.LogWarning(ex, "Metadata lookup via {Provider} failed", name);
                return null;
            }
        }
    }
}
