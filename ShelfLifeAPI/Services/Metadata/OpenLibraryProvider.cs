using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Book metadata from Open Library: free, with no key. It asks apps not to use it as a
    // high-traffic backend, so everything is cached, and each book is only fetched until
    // it has a catalog entry. It publishes monthly data dumps for when that's outgrown.
    //
    // A catalog entry is a work (the book) in a format, the same way a game is a title on
    // a platform. So scanning a paperback and searching for it reach the same entry, and
    // the exact ISBN stays on the owned copy.
    public partial class OpenLibraryProvider : IMetadataProvider, IBarcodeProvider
    {
        private const string Api = "https://openlibrary.org";
        private const string Covers = "https://covers.openlibrary.org/b/id";

        private readonly HttpClient _http;

        public OpenLibraryProvider(HttpClient http) => _http = http;

        public string Source => CatalogSources.OpenLibrary;
        public string DisplayName => "Open Library";
        public string MediaType => MediaTypes.Books;
        public bool IsConfigured => true;

        /// ISBN-13s are EAN barcodes in the "Bookland" 978 and 979 ranges.
        public static bool IsIsbn(string barcode) =>
            barcode.Length == 13 && (barcode.StartsWith("978") || barcode.StartsWith("979"));

        public async Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken)
        {
            var url = $"{Api}/search.json?q={Uri.EscapeDataString(query)}&fields=key,title,author_name,first_publish_year,cover_i&limit=20";
            using var doc = await GetJsonAsync(url, cancellationToken);
            if (doc == null || !doc.RootElement.TryGetProperty("docs", out var docs))
                return [];

            var normalizedQuery = CatalogService.Normalize(query);
            return docs.EnumerateArray()
                .Select(FromSearch(format))
                .Where(c => c != null)
                .Select(c => c!)
                .OrderByDescending(c => CatalogService.Normalize(c.Title) == normalizedQuery)
                .Take(12)
                .ToList();
        }

        public async Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken)
        {
            if (!WorkId().IsMatch(externalId))
                return null;
            using var work = await GetJsonAsync($"{Api}/works/{externalId}.json", cancellationToken);
            return work == null ? null : await FromWorkAsync(work.RootElement, externalId, format.Id, null, null, cancellationToken);
        }

        public async Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken)
        {
            if (!IsIsbn(barcode))
                return [];
            using var edition = await GetJsonAsync($"{Api}/isbn/{barcode}.json", cancellationToken);
            if (edition == null || !edition.RootElement.TryGetProperty("works", out var works) || works.GetArrayLength() == 0)
                return [];

            var workId = IdFrom(works[0].GetProperty("key").GetString());
            if (workId == null)
                return [];
            using var work = await GetJsonAsync($"{Api}/works/{workId}.json", cancellationToken);
            if (work == null)
                return [];

            var candidate = await FromWorkAsync(work.RootElement, workId, FormatFrom(edition.RootElement, formats), CoverFrom(edition.RootElement), edition.RootElement, cancellationToken);
            return [candidate with { Barcode = barcode }];
        }

        private Func<JsonElement, CatalogCandidate?> FromSearch(Format format) => book =>
        {
            var id = IdFrom(book.TryGetProperty("key", out var key) ? key.GetString() : null);
            if (id == null || !book.TryGetProperty("title", out var title))
                return null;
            int? year = book.TryGetProperty("first_publish_year", out var y) ? y.GetInt32() : null;
            var authors = book.TryGetProperty("author_name", out var a)
                ? a.EnumerateArray().Select(n => n.GetString()).Take(2).ToList()
                : [];
            var cover = book.TryGetProperty("cover_i", out var c) && c.GetInt64() > 0 ? CoverUrl(c.GetInt64()) : null;
            return new CatalogCandidate(Source, id, title.GetString()!, format.Id, year, authors.Count > 0 ? string.Join(", ", authors) : null, cover);
        };

        private async Task<CatalogCandidate> FromWorkAsync(JsonElement work, string workId, int? formatId, string? editionCover, JsonElement? edition, CancellationToken cancellationToken)
        {
            var title = work.TryGetProperty("title", out var t) ? t.GetString()! : edition?.GetProperty("title").GetString() ?? "Untitled";
            var year = YearFrom(work, "first_publish_date")
                ?? await FirstPublishedAsync(workId, cancellationToken)
                ?? (edition is { } e ? YearFrom(e, "publish_date") : null);
            var creator = await AuthorsAsync(work, cancellationToken);
            return new CatalogCandidate(Source, workId, title, formatId, year, creator, editionCover ?? CoverFrom(work), Description: DescriptionFrom(work));
        }

        // Works rarely store this, but the search index works it out from every edition. It's
        // what search results show, so a book keeps the same year however it was added.
        private async Task<int?> FirstPublishedAsync(string workId, CancellationToken cancellationToken)
        {
            using var doc = await GetJsonAsync($"{Api}/search.json?q=key:/works/{workId}&fields=first_publish_year&limit=1", cancellationToken);
            return doc != null && doc.RootElement.TryGetProperty("docs", out var docs) && docs.GetArrayLength() > 0
                && docs[0].TryGetProperty("first_publish_year", out var year)
                ? year.GetInt32()
                : null;
        }

        private async Task<string?> AuthorsAsync(JsonElement work, CancellationToken cancellationToken)
        {
            if (!work.TryGetProperty("authors", out var authors))
                return null;
            var names = new List<string>();
            foreach (var entry in authors.EnumerateArray().Take(2))
            {
                if (!entry.TryGetProperty("author", out var author) || !author.TryGetProperty("key", out var key))
                    continue;
                using var doc = await GetJsonAsync($"{Api}{key.GetString()}.json", cancellationToken);
                if (doc != null && doc.RootElement.TryGetProperty("name", out var name) && name.GetString() is { } value)
                    names.Add(value);
            }
            return names.Count > 0 ? string.Join(", ", names) : null;
        }

        private static string CoverUrl(long id) => $"{Covers}/{id}-L.jpg";

        // Unknown covers are listed as -1.
        private static string? CoverFrom(JsonElement record) =>
            record.TryGetProperty("covers", out var covers)
                ? covers.EnumerateArray().Select(c => c.ValueKind == JsonValueKind.Number ? c.GetInt64() : -1).Where(id => id > 0).Select(CoverUrl).FirstOrDefault()
                : null;

        /// Which of our formats this edition is, when it says. Null leaves the choice to the user.
        private static int? FormatFrom(JsonElement edition, IReadOnlyList<Format> formats)
        {
            var physical = edition.TryGetProperty("physical_format", out var p) ? p.GetString()?.ToLowerInvariant() : null;
            if (physical == null)
                return null;
            var name = physical.Contains("mass market") ? "Mass Market Paperback"
                : physical.Contains("hard") || physical.Contains("library binding") ? "Hardcover"
                : physical.Contains("paper") || physical.Contains("soft") ? "Paperback"
                : null;
            return formats.FirstOrDefault(f => f.Name == name)?.Id;
        }

        private static int? YearFrom(JsonElement record, string property) =>
            record.TryGetProperty(property, out var value) && value.GetString() is { } text && YearPattern().Match(text) is { Success: true } match
                ? int.Parse(match.Value)
                : null;

        // Descriptions are either a string or { "value": "..." }, written in Markdown, and
        // contributors often leave a link list or "----------" section at the end.
        private static string? DescriptionFrom(JsonElement work)
        {
            if (!work.TryGetProperty("description", out var description))
                return null;
            var text = description.ValueKind == JsonValueKind.Object
                ? description.TryGetProperty("value", out var value) ? value.GetString() : null
                : description.ValueKind == JsonValueKind.String ? description.GetString() : null;
            if (string.IsNullOrWhiteSpace(text))
                return null;
            text = Trailer().Split(text.Replace("\r\n", "\n"))[0];
            text = SourceNote().Replace(text, string.Empty);
            text = MarkdownLink().Replace(text, "$1").Trim();
            return text.Length > 0 ? text : null;
        }

        private static string? IdFrom(string? key) =>
            key?.Split('/').LastOrDefault() is { } id && WorkId().IsMatch(id) ? id : null;

        // A 404 means Open Library doesn't have it, which isn't a failure.
        private async Task<JsonDocument?> GetJsonAsync(string url, CancellationToken cancellationToken)
        {
            using var response = await _http.GetAsync(url, cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
                return null;
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        }

        [GeneratedRegex(@"^OL\d+W$")]
        private static partial Regex WorkId();

        [GeneratedRegex(@"\b(1[0-9]{3}|20[0-9]{2})\b")]
        private static partial Regex YearPattern();

        [GeneratedRegex(@"\n\s*(-{5,}|\[1\]:)")]
        private static partial Regex Trailer();

        [GeneratedRegex(@"\(\[source\]\[\d+\]\)")]
        private static partial Regex SourceNote();

        // [text](url) and [text][1] both become just the text.
        [GeneratedRegex(@"\[([^\]]+)\](\(https?://[^)\s]+\)|\[\d+\])")]
        private static partial Regex MarkdownLink();
    }
}
