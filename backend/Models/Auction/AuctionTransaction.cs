using System;

namespace eTPL.API.Models.Auction
{
    /// <summary>
    /// Transaction types:
    ///   AUCTION_BID      - TP reserved when placing a bid (debit)
    ///   AUCTION_REFUND   - TP returned when outbid or auction cancelled (credit)
    ///   AUCTION_WIN      - TP permanently deducted after winning and confirming (debit)
    ///   TRANSFER_BUY     - TP paid to buy a player from another user (debit)
    ///   TRANSFER_SELL    - TP received from selling a player to another user (credit)
    ///   BONUS            - TP granted by admin or system reward (credit)
    ///   CONTRACT_RENEWAL - TP spent to renew a player contract (debit)
    ///   LOAN_FEE         - TP paid to take a player on loan (debit)
    ///   LOAN_INCOME      - TP received for loaning out a player (credit)
    ///   FREE_RELEASE     - TP refunded (partial or none) when releasing a player (credit)
    ///   ADJUSTMENT       - Manual correction by admin (credit or debit)
    /// </summary>
    public class AuctionTransaction
    {
        public int TransactionId { get; set; }
        public int UserId { get; set; } // FK to tbm_user.id

        /// <summary>Amount of TP involved. Always positive.</summary>
        public int Amount { get; set; }

        /// <summary>Direction: "CREDIT" or "DEBIT"</summary>
        public string Direction { get; set; } = "DEBIT";

        /// <summary>Transaction type string — see summary above.</summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>Human-readable description, e.g. "Started auction for Messi"</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>User's AvailableBalance immediately AFTER this transaction.</summary>
        public int BalanceAfter { get; set; }

        /// <summary>Optional reference to the related AuctionBoard entry.</summary>
        public int? RelatedAuctionId { get; set; }

        /// <summary>Optional reference to the related player.</summary>
        public int? RelatedPlayerId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User? User { get; set; }
    }
}
