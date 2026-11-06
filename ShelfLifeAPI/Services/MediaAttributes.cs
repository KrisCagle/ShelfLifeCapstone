using System.Text.Json;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services
{
    // Kind of input the client renders: a dropdown, a yes/no toggle, or free text.
    public enum AttributeKind { Select, Toggle, Text }

    public record AttributeDefinition(
        string Key,
        string Label,
        AttributeKind Kind,
        string[]? Options = null,
        string[]? Formats = null,     // limit to these formats (e.g. record speed is vinyl-only)
        string? Placeholder = null,
        bool ShowOnCard = false);     // short enough to show as a badge on the case card

    // The collector details each media type tracks. Adding a media type, or a new
    // detail, is a change here; values are stored as JSON on Item.Attributes.
    public static class MediaAttributes
    {
        private static readonly string[] Regions = ["NTSC-U", "NTSC-J", "PAL", "Region free"];
        private static readonly string[] Grades = ["Mint", "Near Mint", "VG+", "VG", "Good", "Fair", "Poor"];

        public static readonly IReadOnlyDictionary<string, AttributeDefinition[]> ByMediaType =
            new Dictionary<string, AttributeDefinition[]>
            {
                [MediaTypes.Games] =
                [
                    new("completeness", "Completeness", AttributeKind.Select,
                        ["Loose", "Game + box", "Game + manual", "Complete in box", "New / sealed", "Graded"], ShowOnCard: true),
                    new("region", "Region", AttributeKind.Select, Regions),
                    new("variant", "Variant", AttributeKind.Text, Placeholder: "Player's Choice, black label, limited edition…"),
                    new("grade", "Grading", AttributeKind.Text, Placeholder: "e.g. WATA 9.4 A+"),
                ],
                [MediaTypes.Music] =
                [
                    new("mediaGrade", "Media grade", AttributeKind.Select, Grades, ShowOnCard: true),
                    new("sleeveGrade", "Sleeve grade", AttributeKind.Select, Grades),
                    new("speed", "Speed", AttributeKind.Select, ["33⅓ RPM", "45 RPM", "78 RPM"], Formats: ["Vinyl"]),
                    new("pressing", "Pressing", AttributeKind.Text, Placeholder: "1977 US first press, 180g reissue…"),
                    new("colorVariant", "Color / variant", AttributeKind.Text, Placeholder: "Clear red, picture disc…", Formats: ["Vinyl"]),
                    new("catalogNumber", "Catalog number", AttributeKind.Text, Placeholder: "e.g. CS 8163"),
                ],
                [MediaTypes.Books] =
                [
                    new("edition", "Edition", AttributeKind.Select,
                        ["First edition", "Later printing", "Book club", "Reprint"], ShowOnCard: true),
                    new("signed", "Signed", AttributeKind.Toggle),
                    new("dustJacket", "Has dust jacket", AttributeKind.Toggle, Formats: ["Hardcover"]),
                    new("publisher", "Publisher", AttributeKind.Text, Placeholder: "Bantam, Penguin…"),
                ],
                [MediaTypes.Movies] =
                [
                    new("caseType", "Case", AttributeKind.Select,
                        ["Standard", "Clamshell", "Slipcover", "Big box", "Steelbook"], ShowOnCard: true),
                    new("edition", "Edition", AttributeKind.Text, Placeholder: "Special edition, director's cut…"),
                    new("rental", "Ex-rental copy", AttributeKind.Toggle),
                    new("region", "Region", AttributeKind.Select, Regions),
                ],
            };

        public static IEnumerable<AttributeDefinition> For(Format format) =>
            ByMediaType.TryGetValue(format.MediaType, out var defs)
                ? defs.Where(d => d.Formats == null || d.Formats.Contains(format.Name))
                : [];

        /// Keeps only known keys with valid values for this format; returns null when empty.
        public static string? Sanitize(Format format, Dictionary<string, string>? values, out string? error)
        {
            error = null;
            if (values == null || values.Count == 0)
                return null;

            var clean = new Dictionary<string, string>();
            foreach (var def in For(format))
            {
                if (!values.TryGetValue(def.Key, out var raw) || string.IsNullOrWhiteSpace(raw))
                    continue;
                var value = raw.Trim();
                switch (def.Kind)
                {
                    case AttributeKind.Select when !def.Options!.Contains(value):
                        error = $"“{value}” isn't a valid {def.Label.ToLowerInvariant()}.";
                        return null;
                    case AttributeKind.Toggle when value is not ("true" or "false"):
                        error = $"{def.Label} must be true or false.";
                        return null;
                    case AttributeKind.Toggle when value == "false":
                        continue;
                    case AttributeKind.Text when value.Length > 120:
                        error = $"{def.Label} is too long (120 characters max).";
                        return null;
                }
                clean[def.Key] = value;
            }
            return clean.Count == 0 ? null : JsonSerializer.Serialize(clean);
        }

        public static Dictionary<string, string> Parse(string? json) =>
            string.IsNullOrEmpty(json)
                ? []
                : JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? [];
    }
}
