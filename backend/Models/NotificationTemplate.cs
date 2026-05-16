using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    [Table("tbs_notification_template")]
    public class NotificationTemplate
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        [Column("category")]
        public string Category { get; set; } // AUCTION_CONFIRM, TRANSFER, LOAN, MARKET_LISTED, MATCH_DRAW, MATCH_WIN_CLOSE, MATCH_WIN_CRUSHING

        [Required]
        [Column("template_text")]
        public string TemplateText { get; set; }

        [Required]
        [StringLength(20)]
        [Column("target_platform")]
        public string TargetPlatform { get; set; } // DISCORD, LIVE_FEED, BOTH

        [Column("is_active")]
        public bool IsActive { get; set; } = true;
    }
}
