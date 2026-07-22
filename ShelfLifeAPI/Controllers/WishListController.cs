using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using System.Security.Claims;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public class WishlistController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;

        public WishlistController(ShelfLifeDbContext context)
        {
            _context = context;
        }

        private string GetUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var items = await _context.WishlistItems
                .Where(w => w.UserId == userId)
                .Include(w => w.Format)
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();
            var item = await _context.WishlistItems
                .Include(w => w.Format)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (item == null)
                return NotFound();

            if (item.UserId != userId)
                return Forbid();

            return Ok(item);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] WishlistCreateDto dto)
        {
            var userId = GetUserId();
            var item = new WishlistItem
            {
                UserId = userId,
                Title = dto.Title,
                FormatId = dto.FormatId,
                Notes = dto.Notes,
                Priority = dto.Priority
            };
            _context.WishlistItems.Add(item);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] WishlistCreateDto dto)
        {
            var userId = GetUserId();
            var item = await _context.WishlistItems
                .FirstOrDefaultAsync(w => w.Id == id);

            if (item == null)
                return NotFound();

            if (item.UserId != userId)
                return Forbid();

            item.Title = dto.Title;
            item.FormatId = dto.FormatId;
            item.Notes = dto.Notes;
            item.Priority = dto.Priority;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var item = await _context.WishlistItems
                .FirstOrDefaultAsync(w => w.Id == id);

            if (item == null)
                return NotFound();

            if (item.UserId != userId)
                return Forbid();

            _context.WishlistItems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class WishlistCreateDto
    {
        public string Title { get; set; }
        public int FormatId { get; set; }
        public string Notes { get; set; }
        public int Priority { get; set; }
    }
}