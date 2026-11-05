using System.Text.Json;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Movie metadata from TMDB. Needs a free API key: set Tmdb:ApiKey (the v3 key)
    // or Tmdb:ReadAccessToken (the v4 token). TMDB requires attribution in the app.
    public class TmdbProvider : IMetadataProvider
    {
        private const string Api = "https://api.themoviedb.org/3";
        private const string Images = "https://image.tmdb.org/t/p/w342";

        private readonly HttpClient _http;
        private readonly string? _apiKey;
        private readonly string? _token;

        public TmdbProvider(HttpClient http, IConfiguration configuration)
        {
            _http = http;
            _apiKey = configuration["Tmdb:ApiKey"];
            _token = configuration["Tmdb:ReadAccessToken"];
        }

        public string Source => CatalogSources.Tmdb;
        public string DisplayName => "TMDB";
        public string MediaType => MediaTypes.Movies;
        public bool IsConfigured => !string.IsNullOrEmpty(_apiKey) || !string.IsNullOrEmpty(_token);

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            using var doc = await GetJsonAsync($"/search/movie?query={Uri.EscapeDataString(query)}&include_adult=false", cancellationToken);
            if (doc == null || !doc.RootElement.TryGetProperty("results", out var results))
                return [];
            return results.EnumerateArray().Take(12).Select(m => FromMovie(m, format.Id)).ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!int.TryParse(externalId, out var id))
                return null;
            using var doc = await GetJsonAsync($"/movie/{id}", cancellationToken);
            return doc == null ? null : FromMovie(doc.RootElement, format.Id);
        }

        private CatalogCandidate FromMovie(JsonElement m, int formatId)
        {
            int? year = m.TryGetProperty("release_date", out var d) && d.GetString() is { Length: >= 4 } date && int.TryParse(date[..4], out var y) ? y : null;
            var poster = m.TryGetProperty("poster_path", out var p) && p.GetString() is { } path ? $"{Images}{path}" : null;
            // Studio only comes back from the details endpoint.
            var studio = m.TryGetProperty("production_companies", out var companies)
                ? companies.EnumerateArray().Select(c => c.GetProperty("name").GetString()).FirstOrDefault()
                : null;
            return new CatalogCandidate(Source, m.GetProperty("id").GetInt32().ToString(), m.GetProperty("title").GetString()!,
                formatId, year, studio, poster);
        }

        private async Task<JsonDocument?> GetJsonAsync(string path, CancellationToken cancellationToken)
        {
            if (!IsConfigured)
                return null;
            var url = Api + path + (string.IsNullOrEmpty(_token) ? $"{(path.Contains('?') ? '&' : '?')}api_key={_apiKey}" : "");
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            if (!string.IsNullOrEmpty(_token))
                request.Headers.Add("Authorization", $"Bearer {_token}");

            using var response = await _http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return null;
            return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        }
    }
}
