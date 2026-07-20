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
    public class FormatsController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;

        public FormatsController(ShelfLifeDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var formats = await _context.Formats.ToListAsync();
            return Ok(formats);
        }
    }
}