using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public class ItemsController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ItemsController(ShelfLifeDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        private string GetUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        // GET: api/items
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var items = await _context.Items
                .Where(i => i.UserId == userId)
                .Include(i => i.Format)
                .Include(i => i.Condition)
                .Include(i => i.ItemGenres)
                    .ThenInclude(ig => ig.Genre)
                .ToListAsync();

            return Ok(items);
        }

        // GET: api/items/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();
            var item = await _context.Items
                .Include(i => i.Format)
                .Include(i => i.Condition)
                .Include(i => i.ItemGenres)
                    .ThenInclude(ig => ig.Genre)
                .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);

            if (item == null)
                return NotFound();

            return Ok(item);
        }

        // POST: api/items
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ItemCreateDto dto)
        {
            var userId = GetUserId();

            var item = new Item
            {
                UserId = userId,
                Title = dto.Title,
                FormatId = dto.FormatId,
                ConditionId = dto.ConditionId,
                PurchasePrice = dto.PurchasePrice,
                DateAcquired = dto.DateAcquired,
                StoreFound = dto.StoreFound,
                Notes = dto.Notes,
                ImageUrl = dto.ImageUrl,
                Priority = 0
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            if (dto.GenreIds != null && dto.GenreIds.Any())
            {
                foreach (var genreId in dto.GenreIds)
                {
                    _context.ItemGenres.Add(new ItemGenre
                    {
                        ItemId = item.Id,
                        GenreId = genreId
                    });
                }
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
        }

        // PUT: api/items/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ItemCreateDto dto)
        {
            var userId = GetUserId();
            var item = await _context.Items
                .Include(i => i.ItemGenres)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
                return NotFound();

            if (item.UserId != userId)
                return Forbid();

            item.Title = dto.Title;
            item.FormatId = dto.FormatId;
            item.ConditionId = dto.ConditionId;
            item.PurchasePrice = dto.PurchasePrice;
            item.DateAcquired = dto.DateAcquired;
            item.StoreFound = dto.StoreFound;
            item.Notes = dto.Notes;
            item.ImageUrl = dto.ImageUrl;
            item.Priority = 0;

            _context.ItemGenres.RemoveRange(item.ItemGenres);
            if (dto.GenreIds != null && dto.GenreIds.Any())
            {
                foreach (var genreId in dto.GenreIds)
                {
                    _context.ItemGenres.Add(new ItemGenre
                    {
                        ItemId = item.Id,
                        GenreId = genreId
                    });
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/items/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var item = await _context.Items
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
                return NotFound();

            if (item.UserId != userId)
                return Forbid();

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class ItemCreateDto
    {
        public string Title { get; set; }
        public int FormatId { get; set; }
        public int ConditionId { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime DateAcquired { get; set; }
        public string StoreFound { get; set; }
        public string Notes { get; set; }
        public string ImageUrl { get; set; }
        public List<int> GenreIds { get; set; }
    }
}