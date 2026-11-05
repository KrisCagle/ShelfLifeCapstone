using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Dtos;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;
using System.Security.Claims;

namespace ShelfLifeAPI.Controllers
{
    public record WishlistItemDto(
        int Id,
        string Title,
        int FormatId,
        FormatDto Format,
        string? Notes,
        int Priority,
        int? CatalogEntryId,
        string? CatalogSource,
        bool CatalogIsPrivate,
        string? CoverUrl,
        string? Creator,
        int? ReleaseYear)
    {
        public static WishlistItemDto From(WishlistItem w) => new(
            w.Id, w.Title, w.FormatId, FormatDto.From(w.Format), w.Notes, w.Priority,
            w.CatalogEntryId, w.CatalogEntry?.Source, w.CatalogEntry?.CreatedByUserId != null,
            w.CatalogEntry?.CoverUrl, w.CatalogEntry?.Creator, w.CatalogEntry?.ReleaseYear);
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public class WishlistController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;
        private readonly CatalogService _catalog;

        public WishlistController(ShelfLifeDbContext context, CatalogService catalog)
        {
            _context = context;
            _catalog = catalog;
        }

        private string GetUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        private IQueryable<WishlistItem> UserWishlist() =>
            _context.WishlistItems
                .Where(w => w.UserId == GetUserId())
                .Include(w => w.Format)
                .Include(w => w.CatalogEntry);

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await UserWishlist().AsNoTracking().ToListAsync();
            return Ok(items.Select(WishlistItemDto.From));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await UserWishlist().AsNoTracking().FirstOrDefaultAsync(w => w.Id == id);
            return item == null ? NotFound() : Ok(WishlistItemDto.From(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] WishlistSaveDto dto, CancellationToken cancellationToken)
        {
            var item = new WishlistItem { UserId = GetUserId() };
            var error = await ApplyAsync(item, dto, cancellationToken);
            if (error != null)
                return BadRequest(error);

            _context.WishlistItems.Add(item);
            await _context.SaveChangesAsync(cancellationToken);
            var saved = await UserWishlist().AsNoTracking().FirstAsync(w => w.Id == item.Id, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = item.Id }, WishlistItemDto.From(saved));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] WishlistSaveDto dto, CancellationToken cancellationToken)
        {
            var item = await _context.WishlistItems.FirstOrDefaultAsync(w => w.Id == id && w.UserId == GetUserId(), cancellationToken);
            if (item == null)
                return NotFound();

            var error = await ApplyAsync(item, dto, cancellationToken);
            if (error != null)
                return BadRequest(error);

            await _context.SaveChangesAsync(cancellationToken);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.WishlistItems.FirstOrDefaultAsync(w => w.Id == id && w.UserId == GetUserId());
            if (item == null)
                return NotFound();

            _context.WishlistItems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // A hunt can point at a catalog entry (picked from search) or just be free text.
        private async Task<string?> ApplyAsync(WishlistItem item, WishlistSaveDto dto, CancellationToken cancellationToken)
        {
            if (dto.Catalog != null)
            {
                var (entry, error) = await _catalog.ResolveAsync(GetUserId(), dto.Catalog, cancellationToken);
                if (entry == null)
                    return error;
                item.CatalogEntry = entry;
                item.Title = entry.Title;
                item.FormatId = entry.FormatId;
            }
            else
            {
                if (!await _context.Formats.AnyAsync(f => f.Id == dto.FormatId, cancellationToken))
                    return "Pick a format.";
                item.CatalogEntryId = null;
                item.CatalogEntry = null;
                item.Title = dto.Title.Trim();
                item.FormatId = dto.FormatId;
            }
            item.Notes = dto.Notes?.Trim() ?? string.Empty;
            item.Priority = dto.Priority;
            return null;
        }
    }

    public class WishlistSaveDto
    {
        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public int FormatId { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        [Range(1, 3)]
        public int Priority { get; set; } = 2;

        public CatalogRefDto? Catalog { get; set; }
    }
}
