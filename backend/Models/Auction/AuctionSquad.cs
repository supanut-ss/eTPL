using System;

namespace eTPL.API.Models.Auction
{
    public class AuctionSquad
    {
        public int SquadId { get; set; }
        public int UserId { get; set; } // FK to tbm_user.id
        public int PlayerId { get; set; } // FK to pes_player_team.id_player

        public int PricePaid { get; set; } = 0;
        public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;

        // Seasons Tracker
        public int SeasonsWithTeam { get; set; } = 1;

        // Loan
        public bool IsLoan { get; set; } = false;
        public int? LoanedFromUserId { get; set; }  // Who owns the player (null if loan-in from free pool)
        public DateTime? LoanExpiry { get; set; }

        // Status: "Active" | "Listed" | "Loaned"
        public string Status { get; set; } = "Active";
        public int? ListingPrice { get; set; }

        // Navigation properties
        public User? User { get; set; }
        public PesPlayerTeam? Player { get; set; }
    }
}
