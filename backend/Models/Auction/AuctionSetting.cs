using System;

namespace eTPL.API.Models.Auction
{
    public class AuctionSetting
    {
        public int SettingId { get; set; }
        public int StartingBudget { get; set; } = 2000;
        public int MaxSquadSize { get; set; } = 23;
        public int MinBidPrice { get; set; } = 60;
        public DateTime? AuctionStartDate { get; set; }
        public DateTime? AuctionEndDate { get; set; }
        public TimeSpan DailyBidStartTime { get; set; } = new TimeSpan(8, 0, 0); // 08:00
        public TimeSpan DailyBidEndTime { get; set; } = new TimeSpan(23, 59, 59); // 23:59:59
    }
}
