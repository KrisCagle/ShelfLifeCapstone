using System.IO.Compression;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;

namespace ShelfLifeAPI.Controllers
{
    // A person's own account: download everything ShelfLife holds about them, or delete it.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("account")]
    public class AccountController : ControllerBase
    {
        private static readonly JsonSerializerOptions ExportJson = new() { WriteIndented = true };

        private readonly ShelfLifeDbContext _db;
        private readonly UserManager<ApplicationUser> _users;
        private readonly IPhotoStorage _photos;
        private readonly ILogger<AccountController> _logger;

        public AccountController(ShelfLifeDbContext db, UserManager<ApplicationUser> users, IPhotoStorage photos, ILogger<AccountController> logger)
        {
            _db = db;
            _users = users;
            _photos = photos;
            _logger = logger;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        /// A zip with data.json (profile, collection, wishlist) and the photos the person took.
        [HttpGet("export")]
        public async Task<IActionResult> Export(CancellationToken cancellationToken)
        {
            var user = await _users.FindByIdAsync(UserId);
            if (user == null)
                return NotFound();
            var profile = await _db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.IdentityUserId == user.Id, cancellationToken);

            var items = await _db.Items.AsNoTracking()
                .Where(i => i.UserId == user.Id)
                .OrderBy(i => i.Id)
                .Select(i => new
                {
                    i.Id,
                    i.CatalogEntry.Title,
                    Format = i.CatalogEntry.Format.Name,
                    i.CatalogEntry.ReleaseYear,
                    i.CatalogEntry.Creator,
                    i.CatalogEntry.Description,
                    Source = i.CatalogEntry.Source,
                    SourceId = i.CatalogEntry.ExternalId,
                    Condition = i.Condition.Name,
                    i.PurchasePrice,
                    i.DateAcquired,
                    i.StoreFound,
                    i.Notes,
                    i.Barcode,
                    i.Attributes,
                    Genres = i.ItemGenres.Select(g => g.Genre.Name).ToList(),
                    i.PhotoUrl,
                    CoverUrl = i.CatalogEntry.CoverUrl,
                })
                .ToListAsync(cancellationToken);

            var wishlist = await _db.WishlistItems.AsNoTracking()
                .Where(w => w.UserId == user.Id)
                .OrderBy(w => w.Id)
                .Select(w => new { w.Id, w.Title, Format = w.Format.Name, w.Priority, w.Notes })
                .ToListAsync(cancellationToken);

            var photos = items.SelectMany(i => new[] { i.PhotoUrl, i.CoverUrl })
                .Select(PhotoFiles.NameFrom)
                .OfType<string>()
                .Distinct()
                .ToList();

            var data = new
            {
                ExportedAt = DateTime.UtcNow,
                Account = new { user.Email, user.UserName, profile?.FirstName, profile?.LastName },
                Collection = items.Select(i => new
                {
                    i.Id, i.Title, i.Format, i.ReleaseYear, i.Creator, i.Description, i.Source, i.SourceId,
                    i.Condition, i.PurchasePrice, DateAcquired = i.DateAcquired.ToString("yyyy-MM-dd"), i.StoreFound,
                    i.Notes, i.Barcode,
                    Details = string.IsNullOrEmpty(i.Attributes) ? null : JsonSerializer.Deserialize<Dictionary<string, string>>(i.Attributes),
                    i.Genres,
                    // The photo's file name inside this zip's photos folder.
                    Photo = PhotoFiles.NameFrom(i.PhotoUrl) ?? PhotoFiles.NameFrom(i.CoverUrl),
                }),
                Wishlist = wishlist,
            };

            // A temporary file rather than memory: a collection's photos can be hundreds of MB.
            // It deletes itself once the download finishes.
            var buffer = new FileStream(Path.GetTempFileName(), FileMode.Create, FileAccess.ReadWrite, FileShare.None, 81920, FileOptions.DeleteOnClose | FileOptions.Asynchronous);
            using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
            {
                await using (var entry = zip.CreateEntry("data.json").Open())
                    await JsonSerializer.SerializeAsync(entry, data, ExportJson, cancellationToken);

                foreach (var name in photos)
                {
                    await using var source = _photos.Open(name);
                    if (source == null)
                        continue;
                    // Photos are already compressed; zipping them again only costs time.
                    await using var target = zip.CreateEntry($"photos/{name}", CompressionLevel.NoCompression).Open();
                    await source.CopyToAsync(target, cancellationToken);
                }
            }
            buffer.Position = 0;
            return File(buffer, "application/zip", $"shelflife-export-{DateTime.UtcNow:yyyy-MM-dd}.zip");
        }

        /// Deletes the account and everything that belongs to it: collection, wishlist, titles
        /// typed in by hand, and photo files. Shared catalog titles stay, since others use them.
        [HttpPost("delete")]
        public async Task<IActionResult> Delete([FromBody] DeleteAccountDto body, CancellationToken cancellationToken)
        {
            var user = await _users.FindByIdAsync(UserId);
            if (user == null)
                return NotFound();

            // Asking for the password again stops someone at an unlocked phone. Wrong answers
            // count towards the same lockout as signing in.
            if (await _users.IsLockedOutAsync(user))
                return Problem(statusCode: StatusCodes.Status429TooManyRequests, detail: "Too many wrong passwords. Try again in 15 minutes.");
            if (string.IsNullOrEmpty(body.Password) || !await _users.CheckPasswordAsync(user, body.Password))
            {
                await _users.AccessFailedAsync(user);
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "That password isn't right.");
            }

            var photoUrls = await _db.Items.Where(i => i.UserId == user.Id).Select(i => i.PhotoUrl)
                .Concat(_db.CatalogEntries.Where(c => c.CreatedByUserId == user.Id).Select(c => c.CoverUrl))
                .Where(url => url != null && url.StartsWith(PhotoFiles.UrlPrefix))
                .Distinct()
                .ToListAsync(cancellationToken);

            await using (var transaction = await _db.Database.BeginTransactionAsync(cancellationToken))
            {
                // Items go first: their catalog entries can't be deleted while items point at them.
                await _db.Items.Where(i => i.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
                await _db.WishlistItems.Where(w => w.UserId == user.Id).ExecuteDeleteAsync(cancellationToken);
                await _db.CatalogEntries
                    .Where(c => c.CreatedByUserId == user.Id && !c.Items.Any())
                    .ExecuteDeleteAsync(cancellationToken);
                await _db.UserProfiles.Where(p => p.IdentityUserId == user.Id).ExecuteDeleteAsync(cancellationToken);

                var result = await _users.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    _logger.LogError("Deleting account {UserId} failed: {Errors}", user.Id, string.Join("; ", result.Errors.Select(e => e.Code)));
                    return Problem(statusCode: StatusCodes.Status500InternalServerError, detail: "Your account couldn't be deleted. Nothing was removed.");
                }
                await transaction.CommitAsync(cancellationToken);
            }

            // Files go after the database commit: a failure above leaves every photo in place.
            // A photo still used by anyone else's copy or title is kept.
            foreach (var url in photoUrls)
            {
                var stillUsed = await _db.Items.AnyAsync(i => i.PhotoUrl == url, cancellationToken)
                    || await _db.CatalogEntries.AnyAsync(c => c.CoverUrl == url, cancellationToken);
                if (!stillUsed && PhotoFiles.NameFrom(url) is { } name)
                    _photos.Delete(name);
            }

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return NoContent();
        }
    }

    public class DeleteAccountDto
    {
        public string? Password { get; set; }
    }
}
