using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    [Table("tbs_sponsor", Schema = "dbo")]
    public class Sponsor
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(250)]
        [Column("logo")]
        public string Logo { get; set; } = string.Empty;

        [Required]
        [MaxLength(250)]
        [Column("tagline")]
        public string Tagline { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        [Column("website")]
        public string Website { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        [Column("banner_bg")]
        public string BannerBg { get; set; } = "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)";

        [Required]
        [MaxLength(50)]
        [Column("brand_color")]
        public string BrandColor { get; set; } = "#94a3b8";

        [Column("has_banner")]
        public bool HasBanner { get; set; } = true;

        [Column("display_order")]
        public int DisplayOrder { get; set; } = 0;
    }
}
