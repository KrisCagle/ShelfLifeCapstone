using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace ShelfLifeAPI.Services
{
    /// Where uploaded photos live. Hosting can swap this for object storage (Supabase,
    /// S3) without touching the controllers.
    public interface IPhotoStorage
    {
        /// Stores the bytes under a new random name and returns that name.
        Task<string> SaveAsync(Stream content, string extension, CancellationToken cancellationToken);

        /// Null when no photo has that name.
        Stream? Open(string name);

        void Delete(string name);
    }

    public partial class LocalPhotoStorage : IPhotoStorage
    {
        private readonly string _folder;

        public LocalPhotoStorage(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _folder = configuration["Photos:Path"] ?? Path.Combine(environment.ContentRootPath, "App_Data", "photos");
            Directory.CreateDirectory(_folder);
        }

        public async Task<string> SaveAsync(Stream content, string extension, CancellationToken cancellationToken)
        {
            var name = $"{Guid.NewGuid():N}.{extension}";
            await using var file = File.Create(Path.Combine(_folder, name));
            await content.CopyToAsync(file, cancellationToken);
            return name;
        }

        public Stream? Open(string name)
        {
            var path = PathFor(name);
            return path != null && File.Exists(path) ? File.OpenRead(path) : null;
        }

        public void Delete(string name)
        {
            var path = PathFor(name);
            if (path != null)
                File.Delete(path);
        }

        // Names arrive from URLs, so only the exact shape we generate reaches the disk.
        private string? PathFor(string name) => PhotoFiles.IsValidName(name) ? Path.Combine(_folder, name) : null;
    }

    public static partial class PhotoFiles
    {
        public const string UrlPrefix = "/api/photos/";

        public static string UrlFor(string name) => UrlPrefix + name;

        public static bool IsValidName(string name) => NamePattern().IsMatch(name);

        /// The file name, when this URL points at a photo we store ourselves.
        public static string? NameFrom(string? url) =>
            url != null && url.StartsWith(UrlPrefix) && IsValidName(url[UrlPrefix.Length..]) ? url[UrlPrefix.Length..] : null;

        /// Identifies an image by its first bytes. File names and content types come
        /// from the client and can say anything.
        public static string? ExtensionFor(ReadOnlySpan<byte> start)
        {
            if (start.StartsWith<byte>([0xFF, 0xD8, 0xFF]))
                return "jpg";
            if (start.StartsWith<byte>([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
                return "png";
            if (start.Length >= 12 && start[..4].SequenceEqual("RIFF"u8) && start[8..12].SequenceEqual("WEBP"u8))
                return "webp";
            return null;
        }

        public static string ContentTypeFor(string name) => Path.GetExtension(name) switch
        {
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            _ => "image/webp",
        };

        [GeneratedRegex(@"^[0-9a-f]{32}\.(jpg|png|webp)$")]
        private static partial Regex NamePattern();
    }

    /// A full http(s) link, or a photo uploaded here.
    [AttributeUsage(AttributeTargets.Property)]
    public class PhotoUrlAttribute : ValidationAttribute
    {
        public override bool IsValid(object? value) =>
            value is not string url
            || string.IsNullOrWhiteSpace(url)
            || PhotoFiles.NameFrom(url) != null
            || (Uri.TryCreate(url, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));

        public override string FormatErrorMessage(string name) => "That photo link isn't valid.";
    }
}
