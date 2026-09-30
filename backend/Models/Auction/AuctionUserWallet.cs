namespace eTPL.API.Models.Auction
{
    public class AuctionUserWallet
    {
        public int WalletId { get; set; }
        public int UserId { get; set; } // FK to tbm_user.id
        public int AvailableBalance { get; set; }
        public int ReservedBalance { get; set; } = 0;

        /// <summary>Outstanding amount owed back to the system (e.g. from a wallet-correction
        /// incident). Future SPECIAL_BONUS/CYCLE_BONUS credits are diverted here first via
        /// WalletDebtHelper, until it reaches 0, before any of it lands in AvailableBalance.</summary>
        public int DebtAmount { get; set; } = 0;
        public byte[] RowVersion { get; set; } = Array.Empty<byte>(); // Concurrency token

        // Navigation property
        public User? User { get; set; }
    }
}
