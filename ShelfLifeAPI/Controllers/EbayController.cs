using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public class EbayController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ILogger<EbayController> _logger;

        public EbayController(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<EbayController> logger)
        {
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger;
        }

        private async Task<string> GetOAuthToken()
        {
            var appId = _configuration["EbayAppId"];
            var certId = _configuration["EbayCertId"];
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{appId}:{certId}"));

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.ebay.com/identity/v1/oauth2/token");
            request.Headers.Add("Authorization", $"Basic {credentials}");
            request.Content = new StringContent(
                "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
                Encoding.UTF8,
                "application/x-www-form-urlencoded"
            );

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            return json.RootElement.GetProperty("access_token").GetString()!;
        }

        // Fixed-price listing prices for a search; empty when eBay has no matches.
        private async Task<List<decimal>> SearchListingPrices(string token, string query, int limit)
        {
            var searchQuery = Uri.EscapeDataString(query);
            var request = new HttpRequestMessage(HttpMethod.Get,
                $"https://api.ebay.com/buy/browse/v1/item_summary/search?q={searchQuery}&limit={limit}&filter=buyingOptions:%7BFIXED_PRICE%7D");
            request.Headers.Add("Authorization", $"Bearer {token}");
            request.Headers.Add("X-EBAY-C-MARKETPLACE-ID", "EBAY_US");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);

            var prices = new List<decimal>();
            if (!json.RootElement.TryGetProperty("itemSummaries", out var itemSummaries))
                return prices;

            foreach (var item in itemSummaries.EnumerateArray())
            {
                if (item.TryGetProperty("price", out var price) &&
                    price.TryGetProperty("value", out var value) &&
                    decimal.TryParse(value.GetString(), out var priceValue))
                {
                    prices.Add(priceValue);
                }
            }
            return prices;
        }

        private ObjectResult PriceLookupUnavailable() =>
            Problem(statusCode: StatusCodes.Status502BadGateway, title: "Price lookup is unavailable right now.");

        [HttpGet("price")]
        public async Task<IActionResult> GetPrice([FromQuery] string title, [FromQuery] string format)
        {
            try
            {
                var token = await GetOAuthToken();
                var prices = await SearchListingPrices(token, $"{title} {format}", 10);

                if (prices.Count == 0)
                    return Ok(new { message = "No listings found" });

                return Ok(new
                {
                    low = prices.Min(),
                    high = prices.Max(),
                    average = Math.Round(prices.Average(), 2),
                    count = prices.Count,
                    searchTerm = $"{title} {format}"
                });
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException)
            {
                _logger.LogError(ex, "eBay price lookup failed for {Title} ({Format})", title, format);
                return PriceLookupUnavailable();
            }
        }

        [HttpPost("collection-value")]
        public async Task<IActionResult> GetCollectionValue([FromBody] List<CollectionValueRequest> items)
        {
            string token;
            try
            {
                token = await GetOAuthToken();
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException)
            {
                _logger.LogError(ex, "eBay OAuth token request failed");
                return PriceLookupUnavailable();
            }

            decimal totalLow = 0;
            decimal totalHigh = 0;
            decimal totalAverage = 0;
            int itemsFound = 0;

            foreach (var item in items)
            {
                try
                {
                    var prices = await SearchListingPrices(token, $"{item.Title} {item.Format}", 5);
                    if (prices.Count > 0)
                    {
                        totalLow += prices.Min();
                        totalHigh += prices.Max();
                        totalAverage += prices.Average();
                        itemsFound++;
                    }

                    await Task.Delay(100);
                }
                catch (Exception ex) when (ex is HttpRequestException or JsonException)
                {
                    // One failed lookup shouldn't sink the whole estimate.
                    _logger.LogWarning(ex, "eBay lookup failed for {Title} ({Format})", item.Title, item.Format);
                }
            }

            return Ok(new
            {
                totalLow = Math.Round(totalLow, 2),
                totalHigh = Math.Round(totalHigh, 2),
                totalAverage = Math.Round(totalAverage, 2),
                itemsFound
            });
        }

        public class CollectionValueRequest
        {
            public string Title { get; set; }
            public string Format { get; set; }
        }
    }
}
