using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models.LeagueOps
{
    [Table("tbs_league_cycles")]
    public class LeagueCycle
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("cycle_name")]
        public string CycleName { get; set; } = null!;

        [Column("start_date")]
        public DateTime StartDate { get; set; }

        [Column("end_date")]
        public DateTime EndDate { get; set; }

        [Column("match_target")]
        public int MatchTarget { get; set; }

        [Column("bonus_pool")]
        public decimal BonusPool { get; set; }

        [Column("ei_threshold")]
        public int EiThreshold { get; set; }

        [Column("rate_elite")]
        public int RateElite { get; set; }

        [Column("rate_active")]
        public int RateActive { get; set; }

        [Column("rate_warning")]
        public int RateWarning { get; set; }

        [Column("rate_inactive")]
        public int RateInactive { get; set; }

        [Column("status")]
        public string Status { get; set; } = "active";

        [Column("match_start_no")]
        public int MatchStartNo { get; set; }

        [Column("match_end_no")]
        public int MatchEndNo { get; set; }
    }

    [Table("tbs_daily_checkins")]
    public class DailyCheckin
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("cycle_id")]
        public int CycleId { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = null!;

        [Column("checkin_date")]
        public DateTime CheckinDate { get; set; }

        [Column("is_ready")]
        public bool IsReady { get; set; }
    }

    public class PlayerLeagueStat
    {
        public string user_id { get; set; } = null!;
        public int played_count { get; set; }
        public int ready_days { get; set; }
        public decimal p_score { get; set; }
        public decimal r_score { get; set; }
        public decimal ei_score { get; set; }
        public string tier { get; set; } = null!;
        public int multiplier { get; set; }
        public decimal est_bonus { get; set; }
    }
}
