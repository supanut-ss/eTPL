using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    /// <summary>
    /// A single match within a SpecialTournament.
    /// Used for both group-stage matches and knockout-phase matches.
    /// </summary>
    [Table("tbs_special_match", Schema = "dbo")]
    public class SpecialMatch
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("tournament_id")]
        public Guid TournamentId { get; set; }

        /// <summary>"group" or "knockout"</summary>
        [Column("phase")]
        [MaxLength(20)]
        [Required]
        public string Phase { get; set; } = "knockout";

        /// <summary>FK to tbs_special_group — null for knockout-phase matches.</summary>
        [Column("group_id")]
        public Guid? GroupId { get; set; }

        /// <summary>
        /// For knockout: 2=Final, 4=SF, 8=QF, 16=R16, etc. (number of teams remaining at this round).
        /// For group: match day number (1, 2, 3...).
        /// </summary>
        [Column("round")]
        public int Round { get; set; }

        /// <summary>Match ordinal within the round.</summary>
        [Column("match_no")]
        public int MatchNo { get; set; }

        [Column("home_participant_id")]
        public Guid? HomeParticipantId { get; set; }

        [Column("away_participant_id")]
        public Guid? AwayParticipantId { get; set; }

        [Column("home_score")]
        public int? HomeScore { get; set; }

        [Column("away_score")]
        public int? AwayScore { get; set; }

        [Column("is_played")]
        public bool IsPlayed { get; set; } = false;

        /// <summary>True when only one participant is present (auto-advance in knockout).</summary>
        [Column("is_bye")]
        public bool IsBye { get; set; } = false;

        /// <summary>FK to the knockout match the winner advances to.</summary>
        [Column("next_match_id")]
        public Guid? NextMatchId { get; set; }

        /// <summary>FK to the winning participant (populated after result is reported).</summary>
        [Column("winner_id")]
        public Guid? WinnerId { get; set; }
    }
}
