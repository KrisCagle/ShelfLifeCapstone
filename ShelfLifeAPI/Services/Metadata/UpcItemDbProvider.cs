using System.Text.Json;
using System.Text.RegularExpressions;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    // Generic product lookup for any barcode (UPCitemdb's free trial tier, ~100/day, no key).
    // Retail product names are messy ("Super Nintendo Snes Earthbound Big Box…"), so this
    // guesses the format and a clean title, which then feeds a real metadata search.
    public partial class UpcItemDbProvider : IBarcodeProvider
    {
        private readonly HttpClient _http;

        public UpcItemDbProvider(HttpClient http) => _http = http;

        // Checked in order: more specific names first (SNES before NES, GBA before GameBoy).
        private static readonly (string Format, Regex Pattern)[] FormatPatterns =
        [
            ("SNES", new(@"\b(snes|super nintendo|super famicom)\b", RegexOptions.IgnoreCase)),
            ("N64", new(@"\b(n64|nintendo 64)\b", RegexOptions.IgnoreCase)),
            ("NES", new(@"\b(nes|nintendo entertainment system|famicom)\b", RegexOptions.IgnoreCase)),
            ("GameBoy Advance", new(@"\b(gba|game ?boy advance)\b", RegexOptions.IgnoreCase)),
            ("GameBoy", new(@"\bgame ?boy( color)?\b", RegexOptions.IgnoreCase)),
            ("GameCube", new(@"\b(gamecube|game cube|gcn)\b", RegexOptions.IgnoreCase)),
            ("PS2", new(@"\b(ps2|playstation 2)\b", RegexOptions.IgnoreCase)),
            ("PS1", new(@"\b(ps1|psx|playstation)\b(?! ?[2-5])", RegexOptions.IgnoreCase)),
            ("Sega Genesis", new(@"\b(genesis|mega drive)\b", RegexOptions.IgnoreCase)),
            ("VHS", new(@"\bvhs\b", RegexOptions.IgnoreCase)),
            ("Vinyl", new(@"\b(vinyl|lp|12"")\b", RegexOptions.IgnoreCase)),
            ("CD", new(@"\b(cd|compact disc)\b", RegexOptions.IgnoreCase)),
        ];

        public async Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken)
        {
            using var response = await _http.GetAsync($"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}", cancellationToken);
            if (!response.IsSuccessStatusCode)
                return [];
            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            if (!doc.RootElement.TryGetProperty("items", out var items))
                return [];

            return items.EnumerateArray().Take(3).Select(item =>
            {
                var raw = item.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                var category = item.TryGetProperty("category", out var c) ? c.GetString() ?? "" : "";
                var format = GuessFormat($"{raw} {category}", formats);
                var image = item.TryGetProperty("images", out var imgs)
                    ? imgs.EnumerateArray().Select(i => i.GetString()).FirstOrDefault(u => u?.StartsWith("https://") == true)
                    : null;
                return new CatalogCandidate(CatalogSources.Upc, barcode, CleanTitle(raw), format?.Id, null,
                    item.TryGetProperty("brand", out var b) ? b.GetString() : null, image, barcode);
            })
            .Where(c => c.Title.Length > 0)
            .ToList();
        }

        public static Format? GuessFormat(string text, IReadOnlyList<Format> formats)
        {
            foreach (var (name, pattern) in FormatPatterns)
                if (pattern.IsMatch(text))
                    return formats.FirstOrDefault(f => f.Name == name);
            return null;
        }

        // Strip platform names, retail noise and parentheticals to get a searchable title.
        public static string CleanTitle(string raw)
        {
            var title = Parenthetical().Replace(raw, " ");
            foreach (var (_, pattern) in FormatPatterns)
                title = pattern.Replace(title, " ");
            title = Noise().Replace(title, " ");
            title = Symbols().Replace(title, " ");
            return Spaces().Replace(title, " ").Trim(' ', '-', ',', '|', ':');
        }

        [GeneratedRegex(@"\([^)]*\)|\[[^\]]*\]")]
        private static partial Regex Parenthetical();

        // Retail listing noise. Genre words stay out of this list on purpose ("Super Mario RPG").
        [GeneratedRegex(@"\b(video ?games?|games?|nintendo|sony|sega|brand( new)?|new|sealed|factory|complete( in box)?|cib|cart(ridge)?( only)?|tested|works|working|authentic|genuine|original|rare|htf|vintage|ntsc(-u|-j)?|pal|big box|near[- ]mint|mint|vga|wata|q\d+\+?|widescreen|full ?screen|album|ost|soundtrack|edition|free shipping)\b", RegexOptions.IgnoreCase)]
        private static partial Regex Noise();

        [GeneratedRegex(@"[+*#!~/]")]
        private static partial Regex Symbols();

        [GeneratedRegex(@"\s+")]
        private static partial Regex Spaces();
    }
}
