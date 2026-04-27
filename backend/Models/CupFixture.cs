using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    [Table("tbs_cup_fixture", Schema = "dbo")]
    public class CupFixture
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("season")]
        public int Season { get; set; }

        [Column("round")]
        public int Round { get; set; } // e.g., 32, 16, 8, 4, 2

        [Column("match_no")]
        public int MatchNo { get; set; } // Order within the round

        [Column("home_user_id")]
        [MaxLength(100)]
        public string? HomeUserId { get; set; }

        [Column("away_user_id")]
        [MaxLength(100)]
        public string? AwayUserId { get; set; }

        [Column("home_score")]
        public int? HomeScore { get; set; }

        [Column("away_score")]
        public int? AwayScore { get; set; }

        [Column("next_match_id")]
        public Guid? NextMatchId { get; set; } // The match the winner advances to

        [Column("is_played")]
        public bool IsPlayed { get; set; } = false;

        [Column("is_bye")]
        public bool IsBye { get; set; } = false; // Indicates if this match is a bye (one player automatically advances)
    }
}
