using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;
using ShelfLifeAPI.Services.Metadata;

namespace ShelfLifeAPI.Controllers
{
    public record CandidateDto(
        int? CatalogEntryId,
        string Source,
        string? ExternalId,
        string Title,
        int? FormatId,
        string? FormatName,
        int? ReleaseYear,
        string? Creator,
        string? CoverUrl,
        string? Barcode,
        int OwnedCount,
        int? FirstOwnedItemId,
        int? WishlistId);

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public partial class CatalogController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;
        private readonly CatalogService _catalog;
        private readonly MetadataService _metadata;

        public CatalogController(ShelfLifeDbContext context, CatalogService catalog, MetadataService metadata)
        {
            _context = context;
            _catalog = catalog;
            _metadata = metadata;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // GET: api/catalog/attributes — collector fields per media type
        [HttpGet("attributes")]
        [AllowAnonymous]
        public IActionResult Attributes() => Ok(MediaAttributes.ByMediaType);

        // GET: api/catalog/providers — which metadata sources are switched on
        [HttpGet("providers")]
        public IActionResult Providers() => Ok(_metadata.Providers);

        // GET: api/catalog/search?q=chrono&formatId=5
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int formatId, CancellationToken cancellationToken)
        {
            var format = await _context.Formats.FindAsync([formatId], cancellationToken);
            if (format == null)
                return BadRequest("Pick a format.");
            var query = (q ?? string.Empty).Trim();
            if (query.Length < 2)
                return Ok(new { results = Array.Empty<CandidateDto>(), provider = ProviderFor(format) });

            var pattern = $"%{LikeSpecial().Replace(query, @"\$0")}%";
            var local = await _catalog.VisibleTo(UserId)
                .Include(c => c.Format)
                .Where(c => c.FormatId == formatId && EF.Functions.ILike(c.Title, pattern, @"\"))
                .OrderBy(c => c.CreatedByUserId == null)
                .Take(6)
                .ToListAsync(cancellationToken);
            var remote = await _metadata.SearchAsync(query, format, cancellationToken);

            var results = await AnnotateAsync(local, remote, cancellationToken);
            return Ok(new { results, provider = ProviderFor(format) });
        }

        // GET: api/catalog/barcode/0045496830434 — scan result plus "do I own this?"
        [HttpGet("barcode/{code}")]
        public async Task<IActionResult> Barcode(string code, CancellationToken cancellationToken)
        {
            if (!BarcodePattern().IsMatch(code))
                return BadRequest("A barcode is 8 to 14 digits.");

            var local = await _catalog.VisibleTo(UserId)
                .Include(c => c.Format)
                .Where(c => c.Barcode == code || c.Items.Any(i => i.UserId == UserId && i.Barcode == code))
                .Take(6)
                .ToListAsync(cancellationToken);
            var formats = await _context.Formats.ToListAsync(cancellationToken);
            var remote = await _metadata.LookupBarcodeAsync(code, formats, cancellationToken);

            var results = await AnnotateAsync(local, remote, cancellationToken);
            return Ok(new { barcode = code, results });
        }

        private object? ProviderFor(Format format) =>
            _metadata.Providers.FirstOrDefault(p => p.MediaType == format.MediaType);

        // Merges local entries with source results (a source record already in the
        // catalog shows up once, with its entry id) and marks what the user already owns
        // or is hunting.
        private async Task<List<CandidateDto>> AnnotateAsync(List<CatalogEntry> local, IReadOnlyList<CatalogCandidate> remote, CancellationToken cancellationToken)
        {
            var userId = UserId;
            var owned = await _context.Items
                .Where(i => i.UserId == userId)
                .Select(i => new { i.Id, i.CatalogEntryId, i.Barcode, i.CatalogEntry.Source, i.CatalogEntry.ExternalId, i.CatalogEntry.FormatId, i.CatalogEntry.Title })
                .ToListAsync(cancellationToken);
            var wishlist = await _context.WishlistItems
                .Where(w => w.UserId == userId)
                .Select(w => new { w.Id, w.CatalogEntryId, w.FormatId, w.Title })
                .ToListAsync(cancellationToken);
            var formatNames = await _context.Formats.ToDictionaryAsync(f => f.Id, f => f.Name, cancellationToken);

            var remoteKeys = remote.Where(r => r.FormatId != null).Select(r => new { r.Source, r.ExternalId, FormatId = r.FormatId!.Value }).ToList();
            var known = await _context.CatalogEntries
                .Where(c => c.ExternalId != null && remoteKeys.Select(k => k.ExternalId).Contains(c.ExternalId))
                .ToListAsync(cancellationToken);

            var results = new List<CandidateDto>();
            var seenEntries = new HashSet<int>();

            CandidateDto Build(int? entryId, string source, string? externalId, string title, int? formatId, int? year, string? creator, string? cover, string? barcode)
            {
                var normalized = CatalogService.Normalize(title);
                // Retail product names carry extra words ("Earthbound RPG Big Box"), so for
                // those a title that starts the same way counts as a match.
                var fuzzy = source == CatalogSources.Upc;
                bool SameTitle(string other)
                {
                    var o = CatalogService.Normalize(other);
                    return o == normalized || (fuzzy && o.Length >= 5 && (normalized.StartsWith(o) || o.StartsWith(normalized)));
                }

                var copies = owned.Where(i =>
                    (entryId != null && i.CatalogEntryId == entryId) ||
                    (externalId != null && !fuzzy && i.Source == source && i.ExternalId == externalId && i.FormatId == formatId) ||
                    (barcode != null && i.Barcode == barcode) ||
                    (formatId != null && i.FormatId == formatId && SameTitle(i.Title))).ToList();
                var hunt = wishlist.FirstOrDefault(w =>
                    (entryId != null && w.CatalogEntryId == entryId) ||
                    (formatId != null && w.FormatId == formatId && SameTitle(w.Title)));
                return new CandidateDto(entryId, source, externalId, title, formatId,
                    formatId != null && formatNames.TryGetValue(formatId.Value, out var name) ? name : null,
                    year, creator, cover, barcode, copies.Count, copies.FirstOrDefault()?.Id, hunt?.Id);
            }

            foreach (var entry in local)
            {
                seenEntries.Add(entry.Id);
                results.Add(Build(entry.Id, entry.Source, entry.ExternalId, entry.Title, entry.FormatId, entry.ReleaseYear, entry.Creator, entry.CoverUrl, entry.Barcode));
            }

            foreach (var candidate in remote)
            {
                var existing = known.FirstOrDefault(c => c.Source == candidate.Source && c.ExternalId == candidate.ExternalId && c.FormatId == candidate.FormatId);
                if (existing != null && !seenEntries.Add(existing.Id))
                    continue;
                results.Add(Build(existing?.Id, candidate.Source, candidate.ExternalId, candidate.Title, candidate.FormatId,
                    candidate.ReleaseYear, candidate.Creator, candidate.CoverUrl, candidate.Barcode));
            }
            return results;
        }

        [GeneratedRegex(@"[\\%_]")]
        private static partial Regex LikeSpecial();

        [GeneratedRegex(@"^\d{8,14}$")]
        private static partial Regex BarcodePattern();
    }
}
