using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models.Auction
{
    // Read-only entity for existing pes_player_team table
    public class PesPlayerTeam
    {
        public int IdPlayer { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public string? IdTeam { get; set; }
        public string? TeamName { get; set; }
        public int PlayerOvr { get; set; }
        public string? League { get; set; }
        public string? Position { get; set; }
        public string? PlayingStyle { get; set; }
        public string? Foot { get; set; }
        public string? Nationality { get; set; }
        public int? Height { get; set; }
        public int? Weight { get; set; }
        public int? Age { get; set; }
    }
}
