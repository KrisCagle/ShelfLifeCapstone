using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Services.Metadata
{
    /// A title found in a metadata source, before anyone has added it to the catalog.
    public record CatalogCandidate(
        string Source,
        string ExternalId,
        string Title,
        int? FormatId,
        int? ReleaseYear,
        string? Creator,
        string? CoverUrl,
        string? Barcode = null);

    public interface IMetadataProvider
    {
        string Source { get; }

        /// Human-readable name for attribution ("Game data from IGDB").
        string DisplayName { get; }

        string MediaType { get; }

        /// False when the provider needs API keys that aren't configured.
        bool IsConfigured { get; }

        Task<IReadOnlyList<CatalogCandidate>> SearchAsync(string query, Format format, CancellationToken cancellationToken);

        /// Re-fetches one record by id, so shared catalog entries only ever hold data
        /// that came from the source itself, never from a client request.
        Task<CatalogCandidate?> GetAsync(string externalId, Format format, CancellationToken cancellationToken);
    }

    public interface IBarcodeProvider
    {
        Task<IReadOnlyList<CatalogCandidate>> LookupBarcodeAsync(string barcode, IReadOnlyList<Format> formats, CancellationToken cancellationToken);
    }
}
