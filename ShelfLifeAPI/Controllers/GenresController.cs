using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GenresController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;

        public GenresController(ShelfLifeDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var genres = await _context.Genres.ToListAsync();
            return Ok(genres);
        }
    }
}