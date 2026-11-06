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
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public class ItemsController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;
        private readonly CatalogService _catalog;

        public ItemsController(ShelfLifeDbContext context, CatalogService catalog)
        {
            _context = context;
            _catalog = catalog;
        }

        private string GetUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        private IQueryable<Item> UserItems() =>
            _context.Items
                .Where(i => i.UserId == GetUserId())
                .Include(i => i.CatalogEntry).ThenInclude(c => c.Format)
                .Include(i => i.Condition)
                .Include(i => i.ItemGenres).ThenInclude(ig => ig.Genre);

        // GET: api/items
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await UserItems().AsNoTracking().ToListAsync();
            return Ok(items.Select(ItemDto.From));
        }

        // GET: api/items/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await UserItems().AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            return item == null ? NotFound() : Ok(ItemDto.From(item));
        }

        // POST: api/items
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ItemSaveDto dto, CancellationToken cancellationToken)
        {
            var item = new Item { UserId = GetUserId(), ItemGenres = [] };
            var error = await ApplyAsync(item, dto, cancellationToken);
            if (error != null)
                return Invalid(error);

            _context.Items.Add(item);
            await _context.SaveChangesAsync(cancellationToken);

            var saved = await UserItems().AsNoTracking().FirstAsync(i => i.Id == item.Id, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ItemDto.From(saved));
        }

        // POST: api/items/batch — a whole haul: every item saves, or none do
        [HttpPost("batch")]
        public async Task<IActionResult> CreateBatch([FromBody] ItemBatchDto dto, CancellationToken cancellationToken)
        {
            var items = new List<Item>();
            foreach (var (entry, index) in dto.Items.Select((entry, index) => (entry, index)))
            {
                var item = new Item { UserId = GetUserId(), ItemGenres = [] };
                var error = await ApplyAsync(item, entry, cancellationToken);
                if (error != null)
                    return Invalid($"“{entry.Catalog.Title}” (item {index + 1}): {error}");

                _context.Items.Add(item);
                items.Add(item);
            }

            // One SaveChanges is one transaction, and none is held open during the
            // metadata lookups above, which can take a while on a big haul.
            await _context.SaveChangesAsync(cancellationToken);

            var ids = items.Select(i => i.Id).ToList();
            var saved = await UserItems().AsNoTracking().Where(i => ids.Contains(i.Id)).ToListAsync(cancellationToken);
            return Ok(saved.Select(ItemDto.From));
        }

        // PUT: api/items/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ItemSaveDto dto, CancellationToken cancellationToken)
        {
            var item = await _context.Items
                .Include(i => i.ItemGenres)
                .FirstOrDefaultAsync(i => i.Id == id && i.UserId == GetUserId(), cancellationToken);
            if (item == null)
                return NotFound();

            var error = await ApplyAsync(item, dto, cancellationToken);
            if (error != null)
                return Invalid(error);

            await _context.SaveChangesAsync(cancellationToken);
            return NoContent();
        }

        // DELETE: api/items/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id && i.UserId == GetUserId());
            if (item == null)
                return NotFound();

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<string?> ApplyAsync(Item item, ItemSaveDto dto, CancellationToken cancellationToken)
        {
            if (!await _context.Conditions.AnyAsync(c => c.Id == dto.ConditionId, cancellationToken))
                return "Pick a condition.";

            var (entry, error) = await _catalog.ResolveAsync(GetUserId(), dto.Catalog, cancellationToken);
            if (entry == null)
                return error;

            var attributes = MediaAttributes.Sanitize(entry.Format, dto.Attributes, out var attributeError);
            if (attributeError != null)
                return attributeError;

            var genreIds = (dto.GenreIds ?? []).Distinct().ToList();
            var validGenres = await _context.Genres.Where(g => genreIds.Contains(g.Id)).Select(g => g.Id).ToListAsync(cancellationToken);

            item.CatalogEntry = entry;
            item.ConditionId = dto.ConditionId;
            item.PurchasePrice = dto.PurchasePrice;
            item.DateAcquired = dto.DateAcquired;
            item.StoreFound = dto.StoreFound?.Trim() ?? string.Empty;
            item.Notes = dto.Notes?.Trim() ?? string.Empty;
            item.PhotoUrl = string.IsNullOrWhiteSpace(dto.PhotoUrl) ? null : dto.PhotoUrl.Trim();
            item.Barcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode;
            item.Attributes = attributes;

            _context.ItemGenres.RemoveRange(item.ItemGenres.Where(g => !validGenres.Contains(g.GenreId)));
            foreach (var genreId in validGenres.Where(g => item.ItemGenres.All(x => x.GenreId != g)))
                item.ItemGenres.Add(new ItemGenre { GenreId = genreId });
            return null;
        }

        private IActionResult Invalid(string message)
        {
            ModelState.AddModelError(string.Empty, message);
            return ValidationProblem(ModelState);
        }
    }
}
