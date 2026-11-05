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

            // TMDB's settings page shows both a short v3 key and a long v4 token, and they're
            // easy to swap. A v4 token is a JWT (three dot-separated parts), so accept it in
            // either setting and send it the way TMDB expects.
            if (string.IsNullOrEmpty(_token) && _apiKey?.Count(c => c == '.') == 2)
            {
                _token = _apiKey;
                _apiKey = null;
            }
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

            // TMDB's order is popularity-weighted, so "home alone" leads with a 2021 sequel.
            // Exact titles first; on tape formats, films from the tape era (VHS production
            // ended around 2006) before later remakes; then the film most people have rated
            // ("Home Alone" 1990, not an obscure short called "Home, Alone").
            var normalizedQuery = CatalogService.Normalize(query);
            var tapeEra = format.Name == "VHS" ? 2006 : int.MaxValue;
            return results.EnumerateArray()
                .Select((m, index) => (
                    Movie: FromMovie(m, format.Id),
                    Votes: m.TryGetProperty("vote_count", out var v) ? v.GetInt32() : 0,
                    Index: index))
                .OrderByDescending(x => CatalogService.Normalize(x.Movie.Title) == normalizedQuery)
                .ThenByDescending(x => x.Movie.ReleaseYear is int year && year <= tapeEra)
                .ThenByDescending(x => x.Votes)
                .ThenBy(x => x.Index)
                .Take(12)
                .Select(x => x.Movie)
                .ToList();
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
