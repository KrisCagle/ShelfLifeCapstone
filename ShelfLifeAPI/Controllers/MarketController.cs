using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShelfLifeAPI.Services.Market;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/market")]
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    public class MarketController : ControllerBase
    {
        private readonly EbayListings _ebay;
        private readonly CollectorsPaid _paid;

        public MarketController(EbayListings ebay, CollectorsPaid paid)
        {
            _ebay = ebay;
            _paid = paid;
        }

        // GET: api/market/listings?title=Chrono%20Trigger&format=SNES
        [HttpGet("listings")]
        public async Task<IActionResult> Listings([FromQuery] string title, [FromQuery] string? format, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
                return BadRequest("A title is needed.");
            var query = string.IsNullOrWhiteSpace(format) ? title.Trim() : $"{title.Trim()} {format.Trim()}";

            var listings = _ebay.IsConfigured ? await _ebay.SearchAsync(query, cancellationToken) : null;
            return Ok(new
            {
                available = listings != null,
                listings = listings ?? [],
                searchUrl = EbayListings.SearchUrl(query),
                affiliate = _ebay.IsAffiliate,
            });
        }

        // GET: api/market/paid/42
        [HttpGet("paid/{catalogEntryId:int}")]
        public async Task<IActionResult> Paid(int catalogEntryId, CancellationToken cancellationToken)
        {
            var summary = await _paid.ForEntryAsync(catalogEntryId, cancellationToken);
            return summary == null ? NotFound() : Ok(summary);
        }

        // GET: api/market/paid — the typical price of each of your items that has enough data
        [HttpGet("paid")]
        public async Task<IActionResult> CollectionPaid(CancellationToken cancellationToken) =>
            Ok(await _paid.ForCollectionAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!, cancellationToken));
    }
}
