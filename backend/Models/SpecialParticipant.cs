using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    /// <summary>
    /// A single participant (team) in a SpecialTournament.
    /// Participants are free-form: name is entered by admin, no system account required.
    /// </summary>
    [Table("tbs_special_participant", Schema = "dbo")]
    public class SpecialParticipant
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("tournament_id")]
        public Guid TournamentId { get; set; }

        /// <summary>Display name of the participant / team (required, free-form).</summary>
        [Column("display_name")]
        [MaxLength(200)]
        [Required]
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>Optional team name shown alongside the participant.</summary>
        [Column("team_name")]
        [MaxLength(200)]
        public string? TeamName { get; set; }

        /// <summary>Optional logo URL.</summary>
        [Column("logo_url")]
        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        /// <summary>Seed number for bracket placement (1 = top seed).</summary>
        [Column("seed")]
        public int? Seed { get; set; }

        /// <summary>FK to tbs_special_group — set when format = "group_knockout" and groups have been generated.</summary>
        [Column("group_id")]
        public Guid? GroupId { get; set; }

        /// <summary>Whether this participant has been eliminated.</summary>
        [Column("is_eliminated")]
        public bool IsEliminated { get; set; } = false;

        /// <summary>Registration order — used as a tiebreaker for bracket seeding.</summary>
        [Column("registration_order")]
        public int RegistrationOrder { get; set; } = 0;
    }
}
