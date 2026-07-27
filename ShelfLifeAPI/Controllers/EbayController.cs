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

        public EbayController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
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
            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            return json.RootElement.GetProperty("access_token").GetString();
        }

        [HttpGet("price")]
        public async Task<IActionResult> GetPrice([FromQuery] string title, [FromQuery] string format)
        {
            try
            {
                var token = await GetOAuthToken();
                var searchQuery = Uri.EscapeDataString($"{title} {format}");

                var request = new HttpRequestMessage(HttpMethod.Get,
                    $"https://api.ebay.com/buy/browse/v1/item_summary/search?q={searchQuery}&limit=10&filter=buyingOptions:%7BFIXED_PRICE%7D");
                request.Headers.Add("Authorization", $"Bearer {token}");
                request.Headers.Add("X-EBAY-C-MARKETPLACE-ID", "EBAY_US");

                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                var json = JsonDocument.Parse(content);

                // Extract prices from results
                var items = json.RootElement.GetProperty("itemSummaries");
                var prices = new List<decimal>();

                foreach (var item in items.EnumerateArray())
                {
                    if (item.TryGetProperty("price", out var price))
                    {
                        if (price.TryGetProperty("value", out var value))
                        {
                            if (decimal.TryParse(value.GetString(), out var priceValue))
                            {
                                prices.Add(priceValue);
                            }
                        }
                    }
                }

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
            catch (Exception ex)
            {
                Console.WriteLine($"eBay error: {ex.Message}");
                return StatusCode(500, ex.Message);
            }
        }
    }
}