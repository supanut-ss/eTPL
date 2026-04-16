using System;

namespace eTPL.API.Models.Auction
{
    public class TransferOffer
    {
        public int OfferId { get; set; }
        public int SquadId { get; set; }
        public int FromUserId { get; set; }
        public int ToUserId { get; set; }
        public string OfferType { get; set; } = "Transfer"; // "Transfer" or "Loan"
        public int Amount { get; set; }
        public string Status { get; set; } = "Pending"; // "Pending", "Accepted", "Rejected", "Collapsed", "Cancelled"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public AuctionSquad? Squad { get; set; }
        public User? FromUser { get; set; }
        public User? ToUser { get; set; }
    }
}
