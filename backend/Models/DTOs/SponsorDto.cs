using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace eTPL.API.Models.DTOs
{
    /// <summary>
    /// DTO for creating/updating a Sponsor — uses explicit camelCase JsonPropertyName
    /// to avoid case-sensitivity issues with System.Text.Json in .NET 8 Nullable context.
    /// </summary>
    public class SponsorDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; } = 0;

        [Required]
        [MaxLength(200)]
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(250)]
        [JsonPropertyName("logo")]
        public string Logo { get; set; } = "⚽";

        [Required]
        [MaxLength(250)]
        [JsonPropertyName("tagline")]
        public string Tagline { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        [JsonPropertyName("website")]
        public string Website { get; set; } = "https://";

        [MaxLength(500)]
        [JsonPropertyName("bannerBg")]
        public string BannerBg { get; set; } = "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)";

        [MaxLength(50)]
        [JsonPropertyName("brandColor")]
        public string BrandColor { get; set; } = "#94a3b8";

        [JsonPropertyName("hasBanner")]
        public bool HasBanner { get; set; } = true;

        [JsonPropertyName("displayOrder")]
        public int DisplayOrder { get; set; } = 0;
    }
}
