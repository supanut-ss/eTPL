using System;

namespace eTPL.API.Models.Auction
{
    public class AuctionBidLog
    {
        public int LogId { get; set; }
        public int AuctionId { get; set; } // FK to tbs_auction_board
        public int UserId { get; set; } // FK to tbm_user.id
        public int BidAmount { get; set; }
        public string Phase { get; set; } = "Normal"; // "Normal" or "Final"
        public DateTime CreatedAt { get; set; } // UTC

        // Navigation properties
        public AuctionBoard? Auction { get; set; }
        public User? User { get; set; }
    }
}
