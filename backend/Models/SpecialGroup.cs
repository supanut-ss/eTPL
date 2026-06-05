using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    /// <summary>
    /// A group within a group-stage SpecialTournament (e.g., "Group A", "Group B").
    /// </summary>
    [Table("tbs_special_group", Schema = "dbo")]
    public class SpecialGroup
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("tournament_id")]
        public Guid TournamentId { get; set; }

        /// <summary>Display label for this group, e.g. "A", "B", "C".</summary>
        [Column("group_name")]
        [MaxLength(10)]
        [Required]
        public string GroupName { get; set; } = string.Empty;

        /// <summary>Sort order for display.</summary>
        [Column("group_order")]
        public int GroupOrder { get; set; } = 0;
    }
}
