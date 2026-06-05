using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    /// <summary>
    /// A special (one-off) tournament that is managed independently from the league season.
    /// Participants are free-form names entered by admins — no system account required.
    /// </summary>
    [Table("tbs_special_tournament", Schema = "dbo")]
    public class SpecialTournament
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("name")]
        [MaxLength(200)]
        [Required]
        public string Name { get; set; } = string.Empty;

        [Column("description")]
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// "knockout" or "group_knockout"
        /// </summary>
        [Column("format")]
        [MaxLength(30)]
        [Required]
        public string Format { get; set; } = "knockout";

        /// <summary>
        /// "draft" | "registration" | "ongoing" | "completed"
        /// </summary>
        [Column("status")]
        [MaxLength(30)]
        [Required]
        public string Status { get; set; } = "draft";

        /// <summary>
        /// Whether this tournament should appear in the public navigation menu.
        /// </summary>
        [Column("is_public")]
        public bool IsPublic { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("created_by")]
        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        // ─── Group Stage Settings ─────────────────────────────────────────────────

        /// <summary>Number of groups (used when format = "group_knockout").</summary>
        [Column("group_count")]
        public int? GroupCount { get; set; }

        /// <summary>How many teams from each group advance to the knockout phase.</summary>
        [Column("teams_advance_per_group")]
        public int? TeamsAdvancePerGroup { get; set; }
    }
}
