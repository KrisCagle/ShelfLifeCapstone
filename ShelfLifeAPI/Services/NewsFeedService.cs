using System.Net;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using Microsoft.Extensions.Caching.Memory;

namespace ShelfLifeAPI.Services
{
    public record NewsFeedSource(string Name, string Url, string Category);

    public record Headline(
        string Title,
        string Url,
        string Source,
        string Category,
        DateTimeOffset? PublishedAt,
        string? ImageUrl,
        string? Summary);

    // Pulls headlines from the RSS/Atom feeds listed under "News:Feeds" in config.
    // Results are cached so page views never wait on (or hammer) the publishers.
    public partial class NewsFeedService
    {
        private const string CacheKey = "news:headlines";
        private const int PerFeedLimit = 8;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);
        private static readonly XNamespace Atom = "http://www.w3.org/2005/Atom";
        private static readonly XNamespace Media = "http://search.yahoo.com/mrss/";
        private static readonly XNamespace Content = "http://purl.org/rss/1.0/modules/content/";

        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly IConfiguration _configuration;
        private readonly ILogger<NewsFeedService> _logger;

        public NewsFeedService(HttpClient httpClient, IMemoryCache cache, IConfiguration configuration, ILogger<NewsFeedService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _configuration = configuration;
            _logger = logger;
        }

        // One refresh at a time, shared by every request that arrives while it runs.
        private static readonly object RefreshLock = new();
        private static Task<IReadOnlyList<Headline>>? _refresh;

        public Task<IReadOnlyList<Headline>> GetHeadlinesAsync(CancellationToken cancellationToken)
        {
            if (_cache.TryGetValue(CacheKey, out IReadOnlyList<Headline>? cached) && cached != null)
                return Task.FromResult(cached);

            Task<IReadOnlyList<Headline>> refresh;
            lock (RefreshLock)
                refresh = _refresh ??= RefreshAsync();

            // A caller that disconnects stops waiting, but the shared refresh keeps going.
            return refresh.WaitAsync(cancellationToken);
        }

        private async Task<IReadOnlyList<Headline>> RefreshAsync()
        {
            try
            {
                var sources = _configuration.GetSection("News:Feeds").Get<List<NewsFeedSource>>() ?? [];
                var results = await Task.WhenAll(sources.Select(FetchFeedAsync));

                IReadOnlyList<Headline> headlines = results
                    .SelectMany(r => r)
                    .OrderByDescending(h => h.PublishedAt ?? DateTimeOffset.MinValue)
                    .ToList();

                // Don't cache an empty result for long: it usually means the network hiccuped.
                _cache.Set(CacheKey, headlines, headlines.Count > 0 ? CacheDuration : TimeSpan.FromSeconds(30));
                return headlines;
            }
            finally
            {
                lock (RefreshLock)
                    _refresh = null;
            }
        }

        // Bounded by the HttpClient timeout rather than any one request's lifetime.
        private async Task<List<Headline>> FetchFeedAsync(NewsFeedSource source)
        {
            try
            {
                using var response = await _httpClient.GetAsync(source.Url, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();
                await using var stream = await response.Content.ReadAsStreamAsync();

                var settings = new XmlReaderSettings { DtdProcessing = DtdProcessing.Ignore, Async = true };
                using var reader = XmlReader.Create(stream, settings);
                var doc = await XDocument.LoadAsync(reader, LoadOptions.None, CancellationToken.None);

                var entries = doc.Root?.Name == Atom + "feed"
                    ? doc.Root.Elements(Atom + "entry").Select(e => ParseAtomEntry(e, source))
                    : doc.Descendants("item").Select(e => ParseRssItem(e, source));

                return entries.OfType<Headline>().Take(PerFeedLimit).ToList();
            }
            catch (Exception ex) when (ex is HttpRequestException or XmlException or TaskCanceledException)
            {
                _logger.LogWarning(ex, "Skipping news feed {Source} ({Url})", source.Name, source.Url);
                return [];
            }
        }

        private static Headline? ParseRssItem(XElement item, NewsFeedSource source)
        {
            var title = Clean(item.Element("title")?.Value);
            var link = item.Element("link")?.Value.Trim();
            if (string.IsNullOrEmpty(title) || !IsHttpUrl(link))
                return null;

            var html = item.Element(Content + "encoded")?.Value ?? item.Element("description")?.Value;
            var image =
                item.Elements(Media + "content").Select(m => (string?)m.Attribute("url")).FirstOrDefault(IsHttpUrl) ??
                item.Descendants(Media + "thumbnail").Select(m => (string?)m.Attribute("url")).FirstOrDefault(IsHttpUrl) ??
                item.Elements("enclosure")
                    .Where(e => ((string?)e.Attribute("type"))?.StartsWith("image/") == true)
                    .Select(e => (string?)e.Attribute("url")).FirstOrDefault(IsHttpUrl) ??
                FirstImageInHtml(html);

            return new Headline(title, link!, source.Name, source.Category,
                ParseDate(item.Element("pubDate")?.Value), image, Summarize(html));
        }

        private static Headline? ParseAtomEntry(XElement entry, NewsFeedSource source)
        {
            var title = Clean(entry.Element(Atom + "title")?.Value);
            var link = entry.Elements(Atom + "link")
                .Where(l => (string?)l.Attribute("rel") is null or "alternate")
                .Select(l => (string?)l.Attribute("href"))
                .FirstOrDefault();
            if (string.IsNullOrEmpty(title) || !IsHttpUrl(link))
                return null;

            var html = entry.Element(Atom + "content")?.Value ?? entry.Element(Atom + "summary")?.Value;
            var image =
                entry.Descendants(Media + "thumbnail").Select(m => (string?)m.Attribute("url")).FirstOrDefault(IsHttpUrl) ??
                FirstImageInHtml(html);

            var date = entry.Element(Atom + "published")?.Value ?? entry.Element(Atom + "updated")?.Value;
            return new Headline(title, link!, source.Name, source.Category, ParseDate(date), image, Summarize(html));
        }

        private static bool IsHttpUrl(string? url) =>
            Uri.TryCreate(url, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);

        private static DateTimeOffset? ParseDate(string? value) =>
            DateTimeOffset.TryParse(value, out var date) ? date : null;

        private static string? FirstImageInHtml(string? html)
        {
            if (string.IsNullOrEmpty(html))
                return null;
            var match = ImgSrcRegex().Match(html);
            return match.Success && IsHttpUrl(match.Groups[1].Value) ? WebUtility.HtmlDecode(match.Groups[1].Value) : null;
        }

        // Plain-text teaser: tags stripped, entities decoded, cut at a word boundary.
        private static string? Summarize(string? html)
        {
            var text = Clean(html);
            if (string.IsNullOrEmpty(text))
                return null;
            if (text.Length <= 160)
                return text;
            var cut = text.LastIndexOf(' ', 160);
            return text[..(cut > 100 ? cut : 160)].TrimEnd(',', '.', ';', ':') + "…";
        }

        private static string Clean(string? html) =>
            string.IsNullOrEmpty(html)
                ? string.Empty
                : WhitespaceRegex().Replace(WebUtility.HtmlDecode(TagRegex().Replace(html, " ")), " ").Trim();

        [GeneratedRegex("<img[^>]+src=[\"']([^\"']+)[\"']", RegexOptions.IgnoreCase)]
        private static partial Regex ImgSrcRegex();

        [GeneratedRegex("<[^>]+>")]
        private static partial Regex TagRegex();

        [GeneratedRegex("\\s+")]
        private static partial Regex WhitespaceRegex();
    }
}
