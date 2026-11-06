using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ShelfLifeAPI.Services;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/photos")]
    public class PhotosController : ControllerBase
    {
        // The client shrinks photos first, so this only stops abuse.
        private const int MaxBytes = 8 * 1024 * 1024;

        private readonly IPhotoStorage _photos;

        public PhotosController(IPhotoStorage photos) => _photos = photos;

        // POST: api/photos
        [HttpPost]
        [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        [EnableRateLimiting("photos")]
        [RequestSizeLimit(MaxBytes)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxBytes)]
        public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
        {
            await using var content = file.OpenReadStream();
            var start = new byte[12];
            var read = await content.ReadAtLeastAsync(start, start.Length, throwOnEndOfStream: false, cancellationToken);
            var extension = PhotoFiles.ExtensionFor(start.AsSpan(0, read));
            if (extension == null)
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Use a JPEG, PNG or WebP photo.");

            content.Position = 0;
            var name = await _photos.SaveAsync(content, extension, cancellationToken);
            return Ok(new { url = PhotoFiles.UrlFor(name) });
        }

        // GET: api/photos/abc123.jpg
        // Public so a shared link keeps working; names are long and random, so they
        // can't be guessed or listed.
        [HttpGet("{name}")]
        [AllowAnonymous]
        public IActionResult Get(string name)
        {
            var content = _photos.Open(name);
            if (content == null)
                return NotFound();

            Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            Response.Headers.XContentTypeOptions = "nosniff";
            return File(content, PhotoFiles.ContentTypeFor(name));
        }
    }
}
