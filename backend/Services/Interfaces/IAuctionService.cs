using System.Threading.Tasks;
using eTPL.API.Models.Auction;

namespace eTPL.API.Services.Interfaces
{
    public interface IAuctionService
    {
        Task<PagedResultDto<PlayerSearchResultDto>> SearchPlayersAsync(string searchTerm, int page, int pageSize, bool freeAgentOnly = false, string? grade = null);
        Task<AuctionBoardDto> StartAuctionAsync(int playerId, int initiatorUserId);
        Task<System.Collections.Generic.List<AuctionBoardDto>> GetActiveAuctionsAsync(int? currentUserId = null);
        Task<AuctionBoardDto> PlaceNormalBidAsync(int auctionId, int userId, int bidAmount);
        Task<AuctionBoardDto> PlaceFinalBidAsync(int auctionId, int userId, int bidAmount);
        Task<AuctionBoardDto> ConfirmAuctionAsync(int auctionId, int userId);
        Task<AuctionWalletDto> GetWalletAsync(int userId);
        Task<UserAuctionSummaryDto> GetUserSummaryAsync(int userId);
        Task<System.Collections.Generic.List<AuctionSquadDto>> GetMySquadAsync(int userId);
        Task RunLazySweepAsync();
    }
}
