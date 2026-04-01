using System;

namespace eTPL.API.Models.Auction
{
    public class AuctionBoard
    {
        public int AuctionId { get; set; }
        public int PlayerId { get; set; } // FK to pes_player_team.id_player
        public int InitiatorUserId { get; set; } // FK to tbm_user.id
        public int CurrentPrice { get; set; }
        public int? HighestBidderId { get; set; } // FK to tbm_user.id, nullable
        public DateTime NormalEndTime { get; set; } // UTC
        public DateTime FinalEndTime { get; set; } // UTC
        public string DbStatus { get; set; } = "Active"; // "Active", "Sold", "Cancelled"
        public byte[] RowVersion { get; set; } = null!; // Concurrency token

        // Navigation properties
        public PesPlayerTeam? Player { get; set; }
        public User? Initiator { get; set; }
        public User? HighestBidder { get; set; }
    }
}
