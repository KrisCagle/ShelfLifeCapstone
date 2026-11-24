using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace ShelfLifeAPI.Services.Market
{
    public record EbayListing(string Title, decimal Price, string Currency, string? Condition, string? ImageUrl, string Url);

    /// Current eBay listings for a title, shown as eBay lists them, each linking to eBay.
    ///
    /// eBay's API license (§9.5) bans using its data to "suggest or model prices", so this
    /// never turns listings into a value, average or range: helping someone find a copy to
    /// buy is what the Browse API is for. Results may be cached up to 6 hours (§8.1(c)).
    public class EbayListings
    {
        private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(30);
        private const int Limit = 6;

        private readonly HttpClient _http;
        private readonly EbayAuth _auth;
        private readonly IMemoryCache _cache;
        private readonly ILogger<EbayListings> _logger;
        private readonly string? _campaignId;

        public EbayListings(HttpClient http, EbayAuth auth, IMemoryCache cache, IConfiguration configuration, ILogger<EbayListings> logger)
        {
            _http = http;
            _auth = auth;
            _cache = cache;
            _logger = logger;
            _campaignId = configuration["Ebay:CampaignId"];
        }

        public bool IsConfigured => _auth.IsConfigured;

        /// True when links go through the eBay Partner Network, which means the page must
        /// say ShelfLife may earn a commission.
        public bool IsAffiliate => !string.IsNullOrEmpty(_campaignId);

        public static string SearchUrl(string query) => $"https://www.ebay.com/sch/i.html?_nkw={Uri.EscapeDataString(query)}";

        /// Null when eBay couldn't be reached, which is different from no listings.
        public async Task<IReadOnlyList<EbayListing>?> SearchAsync(string query, CancellationToken cancellationToken)
        {
            var key = $"ebay:listings:{query.ToLowerInvariant()}";
            if (_cache.TryGetValue(key, out IReadOnlyList<EbayListing>? cached) && cached != null)
                return cached;

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get,
                    $"https://api.ebay.com/buy/browse/v1/item_summary/search?q={Uri.EscapeDataString(query)}&limit={Limit}");
                request.Headers.Add("Authorization", $"Bearer {await _auth.GetTokenAsync(cancellationToken)}");
                request.Headers.Add("X-EBAY-C-MARKETPLACE-ID", "EBAY_US");
                // With a Partner Network campaign, eBay returns tracked links in itemAffiliateWebUrl.
                if (IsAffiliate)
                    request.Headers.Add("X-EBAY-C-ENDUSERCTX", $"affiliateCampaignId={_campaignId}");

                using var response = await _http.SendAsync(request, cancellationToken);
                response.EnsureSuccessStatusCode();
                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);

                var listings = new List<EbayListing>();
                if (doc.RootElement.TryGetProperty("itemSummaries", out var items))
                    foreach (var item in items.EnumerateArray())
                        if (FromSummary(item) is { } listing)
                            listings.Add(listing);

                _cache.Set(key, (IReadOnlyList<EbayListing>)listings, CacheFor);
                return listings;
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException or TaskCanceledException)
            {
                _logger.LogWarning(ex, "eBay listings lookup failed for {Query}", query);
                return null;
            }
        }

        private static EbayListing? FromSummary(JsonElement item)
        {
            var url = Text(item, "itemAffiliateWebUrl") ?? Text(item, "itemWebUrl");
            var title = Text(item, "title");
            if (url == null || title == null || !item.TryGetProperty("price", out var price)
                || !decimal.TryParse(Text(price, "value"), System.Globalization.CultureInfo.InvariantCulture, out var amount))
                return null;
            var image = item.TryGetProperty("image", out var img) ? Text(img, "imageUrl") : null;
            return new EbayListing(title, amount, Text(price, "currency") ?? "USD", Text(item, "condition"), image, url);
        }

        private static string? Text(JsonElement element, string property) =>
            element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : null;
    }
}
