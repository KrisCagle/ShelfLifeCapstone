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
        private readonly ILogger<UpcItemDbProvider> _logger;

        public UpcItemDbProvider(HttpClient http, ILogger<UpcItemDbProvider> logger)
        {
            _http = http;
            _logger = logger;
        }

        // Checked in order: more specific names first (SNES before NES, GBA before GameBoy).
        private static readonly (string Format, Regex Pattern)[] FormatPatterns =
        [
            ("Nintendo Switch 2", new(@"\b(nintendo )?switch 2\b", RegexOptions.IgnoreCase)),
            ("Nintendo Switch", new(@"\bnintendo switch\b", RegexOptions.IgnoreCase)),
            ("Wii U", new(@"\bwii ?u\b", RegexOptions.IgnoreCase)),
            ("Wii", new(@"\bwii\b", RegexOptions.IgnoreCase)),
            ("Nintendo 3DS", new(@"\b(nintendo )?3ds\b", RegexOptions.IgnoreCase)),
            ("Nintendo DS", new(@"\b(nintendo ds|nds)\b", RegexOptions.IgnoreCase)),
            ("Xbox Series X|S", new(@"\bxbox series( x)?( ?[|/] ?s)?\b", RegexOptions.IgnoreCase)),
            ("Xbox One", new(@"\bxbox one\b", RegexOptions.IgnoreCase)),
            ("Xbox 360", new(@"\bxbox 360\b", RegexOptions.IgnoreCase)),
            ("PS5", new(@"\b(ps ?5|playstation ?5)\b", RegexOptions.IgnoreCase)),
            ("PS4", new(@"\b(ps ?4|playstation ?4)\b", RegexOptions.IgnoreCase)),
            ("PS3", new(@"\b(ps ?3|playstation ?3)\b", RegexOptions.IgnoreCase)),
            ("4K Ultra HD", new(@"\b(4k( ultra hd| uhd)?|ultra hd|uhd)\b", RegexOptions.IgnoreCase)),
            ("Blu-ray", new(@"\bblu[- ]?ray\b", RegexOptions.IgnoreCase)),
            ("DVD", new(@"\bdvds?\b", RegexOptions.IgnoreCase)),
            ("Cassette", new(@"\bcassette\b", RegexOptions.IgnoreCase)),
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
            {
                // 400 = unknown or invalid code; 429 = the trial tier's rate limit.
                _logger.LogInformation("UPCitemdb {Status} for barcode {Barcode}", (int)response.StatusCode, barcode);
                return [];
            }
            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            if (!doc.RootElement.TryGetProperty("items", out var items))
                return [];

            return items.EnumerateArray().Take(3).Select(item =>
            {
                var raw = item.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                var category = item.TryGetProperty("category", out var c) ? c.GetString() ?? "" : "";
                // The title wins: categories are broad ("DVD & Blu-ray Players" for any disc).
                var format = GuessFormat(raw, formats) ?? GuessFormat(category, formats);
                _logger.LogInformation("UPCitemdb {Barcode}: \"{Title}\" category \"{Category}\" -> format {Format}, cleaned \"{Clean}\"",
                    barcode, raw, category, format?.Name ?? "(none)", CleanTitle(raw));
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
            // Sellers pile details after a pipe ("CHAKAN - Boxed | 1990 | Action Platformer").
            title = title.Split('|')[0];
            foreach (var (_, pattern) in FormatPatterns)
                title = pattern.Replace(title, " ");
            title = Noise().Replace(title, " ");
            title = Symbols().Replace(title, " ");
            return Spaces().Replace(title, " ").Trim(' ', '-', ',', '|', ':');
        }

        [GeneratedRegex(@"\([^)]*\)|\[[^\]]*\]")]
        private static partial Regex Parenthetical();

        // Retail listing noise. Genre words stay out of this list on purpose ("Super Mario RPG"),
        // and so does a bare "new" ("New Pokémon Snap", "New Super Mario Bros.").
        [GeneratedRegex(@"\b(video ?games?|games?|nintendo|sony|sega|brand( new)?|new in box|sealed|factory|complete( in box)?|boxed|loose|cib|cart(ridge)?( only)?|tested|works|working|authentic|genuine|original|rare|htf|vintage|ntsc(-u|-j)?|pal|big box|near[- ]mint|mint|vga|wata|q\d+\+?|widescreen|full ?screen|album|ost|soundtrack|edition|free shipping|digital( code| copy)?|combo pack|disc|movie)\b", RegexOptions.IgnoreCase)]
        private static partial Regex Noise();

        [GeneratedRegex(@"[+*#!~/]")]
        private static partial Regex Symbols();

        [GeneratedRegex(@"\s+")]
        private static partial Regex Spaces();
    }
}
