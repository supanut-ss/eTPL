using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models.Auction
{
    // Read-only entity for existing pes_player_team table
    public class PesPlayerTeam
    {
        public int IdPlayer { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public int PlayerOvr { get; set; }
    }
}
