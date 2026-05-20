using System;

namespace eTPL.API.Models.Auction
{
    public class AuctionFavourite
    {
        public int Id { get; set; }
        public int UserId { get; set; } // FK to tbm_user.id
        public int PlayerId { get; set; } // FK to pes_player_team.id_player
        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public User? User { get; set; }
        public PesPlayerTeam? Player { get; set; }
    }
}
