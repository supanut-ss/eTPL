namespace eTPL.API.Models.Auction
{
    public class AuctionUserWallet
    {
        public int WalletId { get; set; }
        public int UserId { get; set; } // FK to tbm_user.id
        public int AvailableBalance { get; set; }
        public int ReservedBalance { get; set; } = 0;

        // Navigation property
        public User? User { get; set; }
    }
}
