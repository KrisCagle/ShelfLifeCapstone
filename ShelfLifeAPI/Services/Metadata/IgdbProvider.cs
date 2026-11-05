using System.Text;
using System.Text.Json;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Game metadata from IGDB. Needs a free Twitch developer app:
    // set Igdb:ClientId and Igdb:ClientSecret (user secrets locally).
    public class IgdbProvider : IMetadataProvider
    {
        private const string Fields = "fields name,first_release_date,total_rating_count,cover.image_id,involved_companies.company.id,involved_companies.company.name,involved_companies.developer,involved_companies.publisher;";

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
            var games = await QueryAsync($"search \"{search}\"; {Fields}{platform} limit 50;", format, cancellationToken);

            // IGDB ranks purely on text, so ROM hacks and fan games that repeat the name
            // ("Super Metroid: Phazon", "Sonic 2 Recreation") crowd out the real release.
            // Exact title first, then titles containing every searched word, then by how many
            // people have rated it: real retail games have hundreds, hacks almost none.
            var words = Words(query);
            return games
                .Select((g, index) => new { g, index, title = Words(g.Candidate.Title) })
                .OrderByDescending(x => x.title.SetEquals(words))
                .ThenByDescending(x => words.IsSubsetOf(x.title))
                .ThenByDescending(x => x.g.Ratings)
                .ThenBy(x => x.index)
                .Take(12)
                .Select(x => x.g.Candidate)
                .ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!long.TryParse(externalId, out var id))
                return null;
            return (await QueryAsync($"{Fields} where id = {id};", format, cancellationToken)).FirstOrDefault()?.Candidate;
        }

        private record IgdbGame(CatalogCandidate Candidate, int Ratings);

        // Lowercased words with accents folded, so "pokemon" matches "Pokémon".
        private static HashSet<string> Words(string text)
        {
            var folded = new string(text.Normalize(NormalizationForm.FormD)
                .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                .ToArray()).ToLowerInvariant();
            return folded.Split(Separators, StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        }

        private static readonly char[] Separators = [' ', ':', '-', '.', ',', '!', '?', '\'', '&', '/', '(', ')'];

        private async Task<IReadOnlyList<IgdbGame>> QueryAsync(string body, Format format, CancellationToken cancellationToken)
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
                var ratings = g.TryGetProperty("total_rating_count", out var r) ? r.GetInt32() : 0;
                return new IgdbGame(new CatalogCandidate(Source, g.GetProperty("id").GetInt64().ToString(), g.GetProperty("name").GetString()!,
                    format.Id, year, Developer(g), cover), ratings);
            }).ToList();
        }

        // The name on the box: the publisher (Square, Nintendo, Konami). Games often list
        // regional publishers too (Pokémon Red: Nintendo and Brazil's Gradiente); IGDB's
        // company ids are roughly in order of addition and the majors went in first, so the
        // lowest id is the main publisher. Falls back to the developer when none is listed.
        private static string? Developer(JsonElement game)
        {
            if (!game.TryGetProperty("involved_companies", out var companies))
                return null;
            static bool Is(JsonElement c, string role) => c.TryGetProperty(role, out var v) && v.GetBoolean();
            static long Id(JsonElement c) => c.TryGetProperty("company", out var co) && co.TryGetProperty("id", out var id) ? id.GetInt64() : long.MaxValue;

            var all = companies.EnumerateArray().Where(c => c.TryGetProperty("company", out _)).ToList();
            var pick = all.Where(c => Is(c, "publisher")).OrderBy(Id).FirstOrDefault();
            if (pick.ValueKind == JsonValueKind.Undefined)
                pick = all.Where(c => Is(c, "developer")).OrderBy(Id).FirstOrDefault();
            if (pick.ValueKind == JsonValueKind.Undefined && all.Count > 0)
                pick = all[0];
            return pick.ValueKind != JsonValueKind.Undefined && pick.GetProperty("company").TryGetProperty("name", out var n)
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
