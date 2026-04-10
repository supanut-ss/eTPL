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
        public int? CurrentUserFinalBid { get; set; }
        public int? WinnerId { get; set; }
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
        public string? MarketStartTime { get; set; }
        public string? MarketEndTime { get; set; }
        public string? MarketStartDate { get; set; }
        public string? MarketEndDate { get; set; }
    }

    public class AuctionSquadDto
    {
        public int SquadId { get; set; }
        public int PlayerId { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public int PlayerOvr { get; set; }
        public string? Position { get; set; }
        public string ImageUrl => $"https://pesdb.net/assets/img/card/b{PlayerId}.png";
        public int? PricePaid { get; set; }
        public DateTime? AcquiredAt { get; set; }
        public DateTime? ContractUntil { get; set; }
        public bool IsLoan { get; set; }
        public DateTime? LoanExpiry { get; set; }
        public string Status { get; set; } = "Active"; // "Active" | "Listed" | "Loaned"
    }

    /// <summary>Status values: "Available", "In Normal Bid", "In Final Bid", "Won"</summary>
    public class PlayerFilterOptionsDto
    {
        public List<string> Leagues { get; set; } = new();
        public List<string> Teams { get; set; } = new();
        public List<string> Positions { get; set; } = new();
        public List<string> PlayingStyles { get; set; } = new();
        public List<string> Feet { get; set; } = new();
        public List<string> Nationalities { get; set; } = new();
    }

    public class PlayerSearchResultDto
    {
        public int IdPlayer { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public int PlayerOvr { get; set; }
        public string ImageUrl => $"https://pesdb.net/assets/img/card/b{IdPlayer}.png";
        public string Status { get; set; } = "Available"; // "Available", "In Normal Bid", "In Final Bid", "Won"
        public int? ActiveAuctionId { get; set; }
        public int? CurrentPrice { get; set; }  // current bid price (for Normal Bid)
        public string? WinnerName { get; set; } // display name of winner (for Won)

        public string? League { get; set; }
        public string? TeamName { get; set; }
        public string? Position { get; set; }
        public string? PlayingStyle { get; set; }
        public string? Foot { get; set; }
        public string? Nationality { get; set; }
        public int? Height { get; set; }
        public int? Weight { get; set; }
        public int? Age { get; set; }
    }

    public class GradeQuotaUsageDto
    {
        public int GradeId { get; set; }
        public string GradeName { get; set; } = string.Empty;
        public int MinOVR { get; set; }
        public int MaxOVR { get; set; }
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

    // ─── Transaction DTO ───────────────────────────────────────────────────────

    public class AuctionTransactionDto
    {
        public int TransactionId { get; set; }
        public int Amount { get; set; }
        public string Direction { get; set; } = "DEBIT"; // "CREDIT" | "DEBIT"
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int BalanceAfter { get; set; }
        public int? RelatedPlayerId { get; set; }
        public string? PlayerName { get; set; }
        public string? RelatedPlayerName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ─── Squad Management Requests ────────────────────────────────────────────

    public class GiveBonusRequest
    {
        public int TargetUserId { get; set; }
        public int Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class ReleasePlayerRequest
    {
        public int SquadId { get; set; }
        public int RefundAmount { get; set; } = 0; // optional partial refund
    }

    public class RenewContractRequest
    {
        public int SquadId { get; set; }
        public int Cost { get; set; }
        public DateTime ContractUntil { get; set; }
    }

    public class LoanPlayerRequest
    {
        public int SquadId { get; set; }         // the player's current squad entry
        public int TargetUserId { get; set; }    // who receives the loan
        public int LoanFee { get; set; }         // TP paid by receiving team
        public DateTime LoanExpiry { get; set; }
    }

    public class TransferOfferRequest
    {
        public int SquadId { get; set; }         // seller's squad entry
        public int BuyerUserId { get; set; }
        public int TransferFee { get; set; }
    }
}

