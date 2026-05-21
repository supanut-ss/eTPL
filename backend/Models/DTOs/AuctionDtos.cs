using System;

namespace eTPL.API.Models.DTOs
{
    public class UpdateAuctionSettingsDto
    {
        public int SettingId { get; set; }
        public int StartingBudget { get; set; }
        public int MaxSquadSize { get; set; }
        public int MinBidPrice { get; set; }
        public DateTime? AuctionStartDate { get; set; }
        public DateTime? AuctionEndDate { get; set; }
        public string DailyBidStartTime { get; set; } = "08:00:00";
        public string DailyBidEndTime { get; set; } = "23:59:59";
        public int NormalBidDurationMinutes { get; set; }
        public int FinalBidDurationMinutes { get; set; }
        public int CurrentSeason { get; set; }
        public bool IsMarketRound2 { get; set; }
    }
}
