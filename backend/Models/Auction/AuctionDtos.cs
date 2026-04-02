using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Auction
{
    public class AuctionBoardDto
    {
        public int AuctionId { get; set; }
        public int PlayerId { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public int PlayerOvr { get; set; }
        public string ImageUrl => $"https://pesdb.net/assets/img/card/b{PlayerId}.png";
        
        public int CurrentPrice { get; set; }
        public int? HighestBidderId { get; set; }
        public string? HighestBidderName { get; set; }
        
        public DateTime NormalEndTime { get; set; }
        public DateTime FinalEndTime { get; set; }
        
        public string DisplayStatus { get; set; } = string.Empty; // "Normal Bid", "Final Bid", "Waiting Confirm", "Sold", "Cancelled", "Expired"
        public string DbStatus { get; set; } = string.Empty;
        public List<int> BidderUserIds { get; set; } = new();
    }

    public class PlaceBidRequest
    {
        public int BidAmount { get; set; }
    }

    public class PlaceFinalBidRequest
    {
        public int BidAmount { get; set; }
    }

    public class AuctionWalletDto
    {
        public int UserId { get; set; }
        public int AvailableBalance { get; set; }
        public int ReservedBalance { get; set; }
        public int TotalBalance => AvailableBalance + ReservedBalance;
    }

    public class UserAuctionSummaryDto
    {
        public AuctionWalletDto Wallet { get; set; } = new();
        public List<AuctionSquadDto> Squad { get; set; } = new();
        public List<GradeQuotaUsageDto> Quotas { get; set; } = new();
        public int CurrentSquadCount { get; set; }
        public int MaxSquadSize { get; set; }
        public int RequiredReserve { get; set; }
    }

    public class AuctionSquadDto
    {
        public int PlayerId { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public int PlayerOvr { get; set; }
        public string ImageUrl => $"https://pesdb.net/assets/img/card/b{PlayerId}.png";
    }

    public class GradeQuotaUsageDto
    {
        public string GradeName { get; set; } = string.Empty;
        public int MaxAllowed { get; set; }
        public int CurrentCount { get; set; }
    }

    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
