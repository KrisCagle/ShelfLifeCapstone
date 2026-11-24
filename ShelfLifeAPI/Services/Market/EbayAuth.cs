using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace ShelfLifeAPI.Services.Market
{
    /// eBay app tokens (client credentials). Shared by every eBay call, so one token is
    /// fetched and reused until shortly before it expires.
    public class EbayAuth
    {
        private const string TokenCacheKey = "ebay:app-token";

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly string? _appId;
        private readonly string? _certId;

        public EbayAuth(HttpClient http, IMemoryCache cache, IConfiguration configuration)
        {
            _http = http;
            _cache = cache;
            _appId = configuration["EbayAppId"];
            _certId = configuration["EbayCertId"];
        }

        public bool IsConfigured => !string.IsNullOrEmpty(_appId) && !string.IsNullOrEmpty(_certId);

        public async Task<string> GetTokenAsync(CancellationToken cancellationToken)
        {
            if (_cache.TryGetValue(TokenCacheKey, out string? cached) && cached != null)
                return cached;

            var credentials = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_appId}:{_certId}"));
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.ebay.com/identity/v1/oauth2/token")
            {
                // Credentials go in the header and body, never the URL, so they can't reach logs.
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
    }
}
