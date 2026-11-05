using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NewsController : ControllerBase
    {
        private readonly ShelfLifeDbContext _context;
        private readonly NewsFeedService _feeds;

        public NewsController(ShelfLifeDbContext context, NewsFeedService feeds)
        {
            _context = context;
            _feeds = feeds;
        }

        // GET: api/news/headlines?category=Games&limit=12
        [HttpGet("headlines")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHeadlines([FromQuery] string? category, [FromQuery] int limit = 24, CancellationToken cancellationToken = default)
        {
            var headlines = await _feeds.GetHeadlinesAsync(cancellationToken);
            var filtered = string.IsNullOrEmpty(category)
                ? Interleave(headlines)
                : headlines.Where(h => h.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            return Ok(filtered.Take(Math.Clamp(limit, 1, 60)));
        }

        // The mixed feed rotates Games/Music/Movies so one busy publisher can't take over.
        private static IEnumerable<Headline> Interleave(IEnumerable<Headline> headlines)
        {
            var byCategory = headlines.GroupBy(h => h.Category).Select(g => g.ToList()).ToList();
            for (var i = 0; byCategory.Any(g => i < g.Count); i++)
                foreach (var group in byCategory.Where(g => i < g.Count))
                    yield return group[i];
        }

        // GET: api/news/posts — published posts, pinned first
        [HttpGet("posts")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPosts()
        {
            var posts = await _context.NewsPosts
                .Where(p => p.PublishedAt <= DateTime.UtcNow)
                .OrderByDescending(p => p.IsPinned)
                .ThenByDescending(p => p.PublishedAt)
                .Take(10)
                .ToListAsync();
            return Ok(posts);
        }

        // GET: api/news/posts/all — includes scheduled posts, for the admin editor
        [HttpGet("posts/all")]
        [Authorize(Policy = AuthPolicies.Admin)]
        public async Task<IActionResult> GetAllPosts()
        {
            var posts = await _context.NewsPosts
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();
            return Ok(posts);
        }

        [HttpPost("posts")]
        [Authorize(Policy = AuthPolicies.Admin)]
        public async Task<IActionResult> CreatePost([FromBody] NewsPostDto dto)
        {
            var post = new NewsPost { CreatedAt = DateTime.UtcNow };
            Apply(dto, post);
            _context.NewsPosts.Add(post);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPosts), new { id = post.Id }, post);
        }

        [HttpPut("posts/{id}")]
        [Authorize(Policy = AuthPolicies.Admin)]
        public async Task<IActionResult> UpdatePost(int id, [FromBody] NewsPostDto dto)
        {
            var post = await _context.NewsPosts.FindAsync(id);
            if (post == null)
                return NotFound();

            Apply(dto, post);
            await _context.SaveChangesAsync();
            return Ok(post);
        }

        [HttpDelete("posts/{id}")]
        [Authorize(Policy = AuthPolicies.Admin)]
        public async Task<IActionResult> DeletePost(int id)
        {
            var post = await _context.NewsPosts.FindAsync(id);
            if (post == null)
                return NotFound();

            _context.NewsPosts.Remove(post);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static void Apply(NewsPostDto dto, NewsPost post)
        {
            post.Title = dto.Title.Trim();
            post.Body = dto.Body.Trim();
            post.LinkUrl = string.IsNullOrWhiteSpace(dto.LinkUrl) ? null : dto.LinkUrl.Trim();
            post.ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl.Trim();
            post.IsPinned = dto.IsPinned;
            post.PublishedAt = dto.PublishedAt?.ToUniversalTime() ?? DateTime.UtcNow;
        }
    }

    public class NewsPostDto
    {
        [Required, MaxLength(120)]
        public string Title { get; set; } = string.Empty;

        [Required, MaxLength(2000)]
        public string Body { get; set; } = string.Empty;

        [Url, MaxLength(500)]
        public string? LinkUrl { get; set; }

        [Url, MaxLength(500)]
        public string? ImageUrl { get; set; }

        public bool IsPinned { get; set; }

        public DateTime? PublishedAt { get; set; }
    }
}
