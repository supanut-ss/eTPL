using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace eTPL.API.Models.Auction
{
    public class AuctionGradeQuota
    {
        public int GradeId { get; set; }
        public string GradeName { get; set; } = string.Empty;
        public int MinOVR { get; set; }
        public int MaxOVR { get; set; }
        public int MaxAllowedPerUser { get; set; }

        [JsonPropertyName("renewalPercent")]
        [Column("RenewalPercent")]
        public int RenewalPercent { get; set; }

        [JsonPropertyName("releasePercent")]
        [Column("ReleasePercent")]
        public int ReleasePercent { get; set; }

        [JsonPropertyName("maxSeasonsPerTeam")]
        [Column("MaxSeasonsPerTeam")]
        public int MaxSeasonsPerTeam { get; set; }
    }
}
