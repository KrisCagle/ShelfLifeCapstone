using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Fallback barcode lookup through eBay's Browse API, which searches listings by GTIN.
    // Free product databases miss plenty of titles (especially recent ones), but nearly
    // everything collectable has been listed on eBay. Listing titles are noisy, so the name
    // is built from what several listings agree on rather than trusted from any one.
    public partial class EbayBarcodeProvider : IBarcodeProvider
    {
        private const string TokenCacheKey = "ebay:app-token";

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly ILogger<EbayBarcodeProvider> _logger;
        private readonly string? _appId;
        private readonly string? _certId;

        public EbayBarcodeProvider(HttpClient http, IMemoryCache cache, IConfiguration configuration, ILogger<EbayBarcodeProvider> logger)
        {
            _http = http;
            _cache = cache;
            _logger = logger;
            _appId = configuration["EbayAppId"];
            _certId = configuration["EbayCertId"];
        }

        public async Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(_appId) || string.IsNullOrEmpty(_certId))
                return [];

            var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.ebay.com/buy/browse/v1/item_summary/search?gtin={barcode}&limit=15");
            request.Headers.Add("Authorization", $"Bearer {await GetTokenAsync(cancellationToken)}");
            request.Headers.Add("X-EBAY-C-MARKETPLACE-ID", "EBAY_US");

            using var response = await _http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogInformation("eBay {Status} for barcode {Barcode}", (int)response.StatusCode, barcode);
                return [];
            }
            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            if (!doc.RootElement.TryGetProperty("itemSummaries", out var summaries))
                return [];

            var listings = summaries.EnumerateArray()
                .Select(i => i.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "")
                .Where(t => t.Length > 0 && !NotTheItem().IsMatch(t))
                .ToList();
            if (listings.Count == 0)
                return [];

            var format = listings
                .Select(t => UpcItemDbProvider.GuessFormat(t, formats))
                .OfType<Format>()
                .GroupBy(f => f.Id)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault()?.First();

            var title = ConsensusTitle(listings
                .Select(t => SellerWords().Replace(UpcItemDbProvider.CleanTitle(t), " "))
                .Select(t => t.Trim(' ', '-', ',', ':'))
                .Where(t => t.Length > 0)
                .ToList());
            _logger.LogInformation("eBay {Barcode}: {Count} listing(s), e.g. \"{Example}\" -> format {Format}, title \"{Title}\"",
                barcode, listings.Count, listings[0], format?.Name ?? "(none)", title);

            return title.Length == 0
                ? []
                : [new CatalogCandidate(CatalogSources.Upc, barcode, title, format?.Id, null, null, null, barcode)];
        }

        // Keeps the words at least half the listings use, in the order they appear in the
        // listing that has the most of them. Sellers disagree on the extras, not the name.
        private static string ConsensusTitle(IReadOnlyList<string> titles)
        {
            if (titles.Count <= 1)
                return titles.FirstOrDefault() ?? string.Empty;

            static string Key(string word) => new string(word.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

            var perListing = titles.Select(t => t.Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToList();
            var needed = (int)Math.Ceiling(titles.Count / 2.0);
            var common = perListing
                .SelectMany(words => words.Select(Key).Where(k => k.Length > 0).Distinct())
                .GroupBy(k => k)
                .Where(g => g.Count() >= needed)
                .Select(g => g.Key)
                .ToHashSet();

            var best = perListing.OrderByDescending(words => words.Count(w => common.Contains(Key(w)))).First();
            return string.Join(' ', best.Where(w => common.Contains(Key(w))));
        }

        private async Task<string> GetTokenAsync(CancellationToken cancellationToken)
        {
            if (_cache.TryGetValue(TokenCacheKey, out string? cached) && cached != null)
                return cached;

            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_appId}:{_certId}"));
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.ebay.com/identity/v1/oauth2/token")
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["scope"] = "https://api.ebay.com/oauth/api_scope",
                }),
            };
            request.Headers.Add("Authorization", $"Basic {credentials}");

            using var response = await _http.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();
            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var token = doc.RootElement.GetProperty("access_token").GetString()!;
            var lifetime = doc.RootElement.GetProperty("expires_in").GetInt32();
            _cache.Set(TokenCacheKey, token, TimeSpan.FromSeconds(Math.Max(60, lifetime - 300)));
            return token;
        }

        // Words sellers add to describe the sale, not the title. Safe to drop here because the
        // result goes on to a real title search ("Star Wars Outlaws", not "New … Limited").
        [GeneratedRegex(@"\b(new|limited|collectors?|exclusive|used|great|excellent|rare|free|fast|ship(ping)?)\b", RegexOptions.IgnoreCase)]
        private static partial Regex SellerWords();

        // Listings that share the barcode but aren't the item itself.
        [GeneratedRegex(@"\b(lot|bundle|mixed|case only|box only|manual only|no game|no disc|replacement|empty|artwork|insert only|poster)\b", RegexOptions.IgnoreCase)]
        private static partial Regex NotTheItem();
    }
}
