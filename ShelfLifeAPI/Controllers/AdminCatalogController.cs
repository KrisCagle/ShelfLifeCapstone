using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShelfLifeAPI.Services;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/admin/catalog")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public class AdminCatalogController : ControllerBase
    {
        private readonly CatalogRematch _rematch;

        public AdminCatalogController(CatalogRematch rematch) => _rematch = rematch;

        // GET: api/admin/catalog/rematch — what would move from IGDB/TMDB to Wikidata. Changes nothing.
        [HttpGet("rematch")]
        public async Task<IActionResult> Preview(CancellationToken cancellationToken) =>
            Ok(await _rematch.PreviewAsync(cancellationToken));

        // POST: api/admin/catalog/rematch — switch only the entries listed, after a preview.
        [HttpPost("rematch")]
        public async Task<IActionResult> Apply([FromBody] RematchRequest request, CancellationToken cancellationToken) =>
            Ok(await _rematch.ApplyAsync(request.EntryIds, cancellationToken));

        public class RematchRequest
        {
            [Required, MinLength(1), MaxLength(500)]
            public List<int> EntryIds { get; set; } = [];
        }
    }
}
