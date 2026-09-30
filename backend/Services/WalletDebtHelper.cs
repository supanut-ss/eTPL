using System;
using eTPL.API.Models.Auction;

namespace eTPL.API.Services
{
    /// <summary>
    /// Diverts bonus-type credits (SPECIAL_BONUS, CYCLE_BONUS) toward an outstanding
    /// wallet debt before any of it reaches AvailableBalance. Used to claw back money
    /// a user received in error (e.g. the FINAL_BID_REFUND duplicate-credit incident)
    /// without touching what they already spent, or their current ReservedBalance.
    /// </summary>
    public static class WalletDebtHelper
    {
        public static string ApplyBonusWithDebtRepayment(AuctionUserWallet wallet, int bonusAmount)
        {
            if (wallet.DebtAmount <= 0)
            {
                wallet.AvailableBalance += bonusAmount;
                return "";
            }

            int toDebt = Math.Min(wallet.DebtAmount, bonusAmount);
            int toWallet = bonusAmount - toDebt;

            wallet.DebtAmount -= toDebt;
            wallet.AvailableBalance += toWallet;

            return toWallet > 0
                ? $" [หักชำระยอดคงค้าง {toDebt} TP, เข้า wallet จริง {toWallet} TP, คงเหลือหนี้ {wallet.DebtAmount} TP]"
                : $" [หักชำระยอดคงค้าง {toDebt} TP, คงเหลือหนี้ {wallet.DebtAmount} TP]";
        }
    }
}
