using System.Threading.Tasks;

namespace eTPL.API.Services.Interfaces
{
    public interface IDiscordService
    {
        Task SendMatchResultAsync(string message, bool isEdit = false);
        Task SendMatchResultAsync(string homeTeam, string awayTeam, int homeScore, int awayScore, string? division = null, string? reporter = null, bool isEdit = false);
        Task SendAuctionConfirmAsync(string playerName, string teamName, int price, string? pesPlayerId = null);
        Task SendTransferAsync(string playerName, string fromTeam, string toTeam, int price, bool isLoan = false, string? pesPlayerId = null);
        Task SendNewsAnnouncementAsync(string message);
        Task SendSeasonEventAsync(string title, string message);
        Task SendPlayerListedAsync(string playerName, string teamName, int price, string? pesPlayerId = null);
        Task SendCustomEmbedAsync(string title, string description, int color, string? imageUrl = null);
    }
}
