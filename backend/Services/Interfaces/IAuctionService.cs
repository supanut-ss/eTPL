using System.Collections.Generic;
using System.Threading.Tasks;
using eTPL.API.Models.Auction;

namespace eTPL.API.Services.Interfaces
{
    public interface IAuctionService
    {
        Task<PagedResultDto<PlayerSearchResultDto>> SearchPlayersAsync(
            string searchTerm, 
            int page, 
            int pageSize, 
            bool freeAgentOnly = false, 
            string? grade = null,
            string? league = null,
            string? teamName = null,
            string? position = null,
            string? playingStyle = null,
            string? foot = null,
            string? nationality = null,
            int? minHeight = null,
            int? maxHeight = null,
            int? minWeight = null,
            int? maxWeight = null,
            int? minAge = null,
            int? maxAge = null);

        Task<PlayerFilterOptionsDto> GetPlayerFilterOptionsAsync(string? league = null);

        Task<AuctionBoardDto> StartAuctionAsync(int playerId, int initiatorUserId);
        Task<List<AuctionBoardDto>> GetActiveAuctionsAsync(int? currentUserId = null);
        Task<AuctionBoardDto> PlaceNormalBidAsync(int auctionId, int userId, int bidAmount);
        Task<AuctionBoardDto> PlaceFinalBidAsync(int auctionId, int userId, int bidAmount);
        Task<AuctionBoardDto> ConfirmAuctionAsync(int auctionId, int userId);
        
        Task<AuctionWalletDto> GetWalletAsync(int userId);
        Task<UserAuctionSummaryDto> GetUserSummaryAsync(int userId);
        Task<List<AuctionSquadDto>> GetMySquadAsync(int userId);
        Task RunLazySweepAsync();

        // Transaction history
        Task<PagedResultDto<AuctionTransactionDto>> GetTransactionsAsync(int userId, int page = 1, int pageSize = 20);

        // Squad lifecycle
        Task GiveBonusAsync(int adminUserId, GiveBonusRequest request);
        Task ReleasePlayerAsync(int userId, ReleasePlayerRequest request);
        Task RenewContractAsync(int userId, RenewContractRequest request);
        Task LoanPlayerAsync(int ownerUserId, LoanPlayerRequest request);
        Task TransferPlayerAsync(int sellerUserId, TransferOfferRequest request);
    }
}
