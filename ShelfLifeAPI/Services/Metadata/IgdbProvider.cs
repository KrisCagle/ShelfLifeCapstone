using System.Text;
using System.Text.Json;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Game metadata from IGDB. Needs a free Twitch developer app:
    // set Igdb:ClientId and Igdb:ClientSecret (user secrets locally).
    public class IgdbProvider : IMetadataProvider
    {
        private const string Fields = "fields name,first_release_date,cover.image_id,involved_companies.company.name,involved_companies.publisher;";

        // IGDB platform ids for the formats we carry.
        private static readonly Dictionary<string, int> PlatformIds = new()
        {
            ["NES"] = 18,
            ["SNES"] = 19,
            ["N64"] = 4,
            ["PS1"] = 7,
            ["PS2"] = 8,
            ["GameBoy"] = 33,
            ["GameBoy Advance"] = 24,
            ["GameCube"] = 21,
            ["Sega Genesis"] = 29,
        };

        private static readonly SemaphoreSlim TokenLock = new(1, 1);
        private static string? _token;
        private static DateTime _tokenExpires;

        private readonly HttpClient _http;
        private readonly string? _clientId;
        private readonly string? _clientSecret;

        public IgdbProvider(HttpClient http, IConfiguration configuration)
        {
            _http = http;
            _clientId = configuration["Igdb:ClientId"];
            _clientSecret = configuration["Igdb:ClientSecret"];
        }

        public string Source => CatalogSources.Igdb;
        public string DisplayName => "IGDB";
        public string MediaType => MediaTypes.Games;
        public bool IsConfigured => !string.IsNullOrEmpty(_clientId) && !string.IsNullOrEmpty(_clientSecret);

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            var search = query.Replace("\\", "").Replace("\"", "");
            var platform = PlatformIds.TryGetValue(format.Name, out var p) ? $" where platforms = ({p});" : "";
            return await QueryAsync($"search \"{search}\"; {Fields}{platform} limit 12;", format, cancellationToken);
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!long.TryParse(externalId, out var id))
                return null;
            return (await QueryAsync($"{Fields} where id = {id};", format, cancellationToken)).FirstOrDefault();
        }

        private async Task<IReadOnlyList<CatalogCandidate>> QueryAsync(string body, Format format, CancellationToken cancellationToken)
        {
            if (!IsConfigured)
                return [];

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.igdb.com/v4/games")
            {
                Content = new StringContent(body, Encoding.UTF8, "text/plain"),
            };
            request.Headers.Add("Client-ID", _clientId);
            request.Headers.Add("Authorization", $"Bearer {await GetTokenAsync(cancellationToken)}");

            using var response = await _http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return [];
            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);

            return doc.RootElement.EnumerateArray().Select(g =>
            {
                var cover = g.TryGetProperty("cover", out var c) && c.TryGetProperty("image_id", out var img)
                    ? $"https://images.igdb.com/igdb/image/upload/t_cover_big/{img.GetString()}.jpg"
                    : null;
                int? year = g.TryGetProperty("first_release_date", out var d)
                    ? DateTimeOffset.FromUnixTimeSeconds(d.GetInt64()).Year
                    : null;
                return new CatalogCandidate(Source, g.GetProperty("id").GetInt64().ToString(), g.GetProperty("name").GetString()!,
                    format.Id, year, Publisher(g), cover);
            }).ToList();
        }

        private static string? Publisher(JsonElement game)
        {
            if (!game.TryGetProperty("involved_companies", out var companies))
                return null;
            var all = companies.EnumerateArray().ToList();
            var pick = all.FirstOrDefault(c => c.TryGetProperty("publisher", out var p) && p.GetBoolean());
            if (pick.ValueKind == JsonValueKind.Undefined && all.Count > 0)
                pick = all[0];
            return pick.ValueKind != JsonValueKind.Undefined && pick.TryGetProperty("company", out var co) && co.TryGetProperty("name", out var n)
                ? n.GetString()
                : null;
        }

        // App access token from Twitch, cached until shortly before it expires.
        private async Task<string> GetTokenAsync(CancellationToken cancellationToken)
        {
            await TokenLock.WaitAsync(cancellationToken);
            try
            {
                if (_token != null && DateTime.UtcNow < _tokenExpires)
                    return _token;

                var url = $"https://id.twitch.tv/oauth2/token?client_id={Uri.EscapeDataString(_clientId!)}&client_secret={Uri.EscapeDataString(_clientSecret!)}&grant_type=client_credentials";
                using var response = await _http.PostAsync(url, null, cancellationToken);
                response.EnsureSuccessStatusCode();
                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                _token = doc.RootElement.GetProperty("access_token").GetString();
                _tokenExpires = DateTime.UtcNow.AddSeconds(doc.RootElement.GetProperty("expires_in").GetInt32() - 300);
                return _token!;
            }
            finally
            {
                TokenLock.Release();
            }
        }
    }
}
