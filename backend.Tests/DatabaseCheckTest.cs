using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Xunit.Abstractions;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.Auction;

namespace eTPL.API.Tests
{
    public class DatabaseCheckTest
    {
        private readonly ITestOutputHelper _output;

        public DatabaseCheckTest(ITestOutputHelper output)
        {
            _output = output;
        }

        private MsSqlDbContext GetDbContext()
        {
            var connectionString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;";
            var options = new DbContextOptionsBuilder<MsSqlDbContext>()
                .UseSqlServer(connectionString)
                .Options;
            return new MsSqlDbContext(options);
        }

        [Fact]
        public async Task FindTransferReleaseMismatches()
        {
            using var db = GetDbContext();

            _output.WriteLine("=== STARTING SPECIFIC TRANFER-RELEASE ANALYSIS ===");

            var releaseTxs = await db.AuctionTransactions
                .Where(t => (t.Type == "FREE_RELEASE" || t.Type == "AUTO_RELEASE_EXPIRED") && t.Direction == "CREDIT")
                .OrderBy(t => t.CreatedAt)
                .ToListAsync();

            _output.WriteLine($"Total release transactions: {releaseTxs.Count}");

            var userIds = releaseTxs.Select(t => t.UserId).Distinct().ToList();
            var users = userIds.Any()
                ? await db.Users.FromSqlRaw($"SELECT * FROM dbo.tbm_user WHERE id IN ({string.Join(",", userIds)})").ToListAsync()
                : new List<User>();
            var userMap = users.ToDictionary(u => u.Id, u => u);

            var playerIds = releaseTxs.Where(t => t.RelatedPlayerId.HasValue).Select(t => t.RelatedPlayerId!.Value).Distinct().ToList();
            var players = playerIds.Any()
                ? await db.PesPlayerTeams.FromSqlRaw($"SELECT * FROM dbo.pes_player_team WHERE id_player IN ({string.Join(",", playerIds)})").ToListAsync()
                : new List<PesPlayerTeam>();
            var playerMap = players.ToDictionary(p => p.IdPlayer, p => p);

            // Fetch existing adjustments to avoid listing already-fixed cases
            var existingAdjustments = await db.AuctionTransactions
                .Where(t => t.Type == "ADJUSTMENT" && t.Direction == "DEBIT" && t.RelatedPlayerId.HasValue && t.Description.Contains("หักเงินคืนเกิน"))
                .Select(t => new { t.UserId, PlayerId = t.RelatedPlayerId!.Value })
                .Distinct()
                .ToListAsync();

            var adjustedSet = new HashSet<(int UserId, int PlayerId)>(existingAdjustments.Select(x => (x.UserId, x.PlayerId)));

            var quotas = await db.AuctionGradeQuotas.ToListAsync();

            int matchedMismatches = 0;

            foreach (var tx in releaseTxs)
            {
                if (!tx.RelatedPlayerId.HasValue) continue;

                int playerId = tx.RelatedPlayerId.Value;
                int userId = tx.UserId;

                // Skip if already adjusted
                if (adjustedSet.Contains((userId, playerId))) continue;

                var player = playerMap.TryGetValue(playerId, out var p) ? p : null;
                if (player == null) continue;

                var user = userMap.TryGetValue(userId, out var u) ? u.UserId : $"ID:{userId}";

                // Find acquisition transaction prior to the release
                var acquisitionTx = await db.AuctionTransactions
                    .Where(t => t.UserId == userId && 
                                t.RelatedPlayerId == playerId && 
                                (t.Type == "AUCTION_WIN" || t.Type == "TRANSFER_BUY" || t.Type == "MARKET_BUY") &&
                                t.CreatedAt < tx.CreatedAt)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync();

                if (acquisitionTx == null) continue;

                int pricePaid = acquisitionTx.Amount;

                // Find latest sold auction before release
                var latestAuction = await db.AuctionBoards
                    .Where(b => b.PlayerId == playerId && 
                                b.DbStatus == "Sold" && 
                                b.NormalEndTime < tx.CreatedAt)
                    .OrderByDescending(b => b.AuctionId)
                    .FirstOrDefaultAsync();

                int latestAuctionPrice = latestAuction?.CurrentPrice ?? player.PlayerOvr;
                int ovr = player.PlayerOvr;

                // We only care about cases where the transaction price (pricePaid) exceeds the auction price
                if (pricePaid <= latestAuctionPrice) continue;

                // Calculate base release price
                int basePriceExpected = latestAuctionPrice; // capped at latest auction price

                var quota = quotas.FirstOrDefault(q => ovr >= q.MinOVR && ovr <= q.MaxOVR);
                int releasePercent = quota?.ReleasePercent ?? 0;
                int expectedRefund = (int)Math.Round((double)basePriceExpected * releasePercent / 100.0);

                if (tx.Amount != expectedRefund)
                {
                    matchedMismatches++;
                    _output.WriteLine("--------------------------------------------------");
                    _output.WriteLine($"Mismatch found on TxID {tx.TransactionId} (Released at: {tx.CreatedAt}):");
                    _output.WriteLine($"User: {user} (Id: {userId}) | Player: {player.PlayerName} (OVR {ovr})");
                    _output.WriteLine($"Acquisition price (pricePaid): {pricePaid} via {acquisitionTx.Type} (TxID: {acquisitionTx.TransactionId}, Date: {acquisitionTx.CreatedAt})");
                    _output.WriteLine($"Latest Auction Price: {latestAuctionPrice} (AuctionID: {latestAuction?.AuctionId})");
                    _output.WriteLine($"Release Percent: {releasePercent}%");
                    _output.WriteLine($"Expected Base Price: {basePriceExpected} | Expected Refund: {expectedRefund}");
                    _output.WriteLine($"Actual Refund Paid: {tx.Amount}");
                    _output.WriteLine($"Difference (Actual - Expected): {tx.Amount - expectedRefund}");
                }
            }

            _output.WriteLine("==================================================");
            _output.WriteLine($"Total matching mismatches: {matchedMismatches}");
            Assert.Equal(0, matchedMismatches);
        }

        [Fact]
        public async Task FixReleaseMismatches()
        {
            using var db = GetDbContext();
            using var transaction = await db.Database.BeginTransactionAsync();

            _output.WriteLine("=== STARTING DATABASE FIX FOR OVERPAID RELEASE REFUNDS ===");

            var releaseTxs = await db.AuctionTransactions
                .Where(t => (t.Type == "FREE_RELEASE" || t.Type == "AUTO_RELEASE_EXPIRED") && t.Direction == "CREDIT")
                .OrderBy(t => t.CreatedAt)
                .ToListAsync();

            var userIds = releaseTxs.Select(t => t.UserId).Distinct().ToList();
            var users = userIds.Any()
                ? await db.Users.FromSqlRaw($"SELECT * FROM dbo.tbm_user WHERE id IN ({string.Join(",", userIds)})").ToListAsync()
                : new List<User>();
            var userMap = users.ToDictionary(u => u.Id, u => u);

            var playerIds = releaseTxs.Where(t => t.RelatedPlayerId.HasValue).Select(t => t.RelatedPlayerId!.Value).Distinct().ToList();
            var players = playerIds.Any()
                ? await db.PesPlayerTeams.FromSqlRaw($"SELECT * FROM dbo.pes_player_team WHERE id_player IN ({string.Join(",", playerIds)})").ToListAsync()
                : new List<PesPlayerTeam>();
            var playerMap = players.ToDictionary(p => p.IdPlayer, p => p);

            var wallets = await db.AuctionUserWallets.ToListAsync();
            var walletMap = wallets.ToDictionary(w => w.UserId, w => w);

            // Fetch existing adjustments to avoid double-correcting
            var existingAdjustments = await db.AuctionTransactions
                .Where(t => t.Type == "ADJUSTMENT" && t.Direction == "DEBIT" && t.RelatedPlayerId.HasValue && t.Description.Contains("หักเงินคืนเกิน"))
                .Select(t => new { t.UserId, PlayerId = t.RelatedPlayerId!.Value })
                .Distinct()
                .ToListAsync();

            var adjustedSet = new HashSet<(int UserId, int PlayerId)>(existingAdjustments.Select(x => (x.UserId, x.PlayerId)));

            var quotas = await db.AuctionGradeQuotas.ToListAsync();

            int fixedCount = 0;

            foreach (var tx in releaseTxs)
            {
                if (!tx.RelatedPlayerId.HasValue) continue;

                int playerId = tx.RelatedPlayerId.Value;
                int userId = tx.UserId;

                // Skip if already adjusted
                if (adjustedSet.Contains((userId, playerId))) continue;

                var player = playerMap.TryGetValue(playerId, out var p) ? p : null;
                if (player == null) continue;

                var user = userMap.TryGetValue(userId, out var u) ? u.UserId : $"ID:{userId}";

                // Find acquisition transaction prior to the release
                var acquisitionTx = await db.AuctionTransactions
                    .Where(t => t.UserId == userId && 
                                t.RelatedPlayerId == playerId && 
                                (t.Type == "AUCTION_WIN" || t.Type == "TRANSFER_BUY" || t.Type == "MARKET_BUY") &&
                                t.CreatedAt < tx.CreatedAt)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync();

                if (acquisitionTx == null) continue;

                int pricePaid = acquisitionTx.Amount;

                // Find latest sold auction before release
                var latestAuction = await db.AuctionBoards
                    .Where(b => b.PlayerId == playerId && 
                                b.DbStatus == "Sold" && 
                                b.NormalEndTime < tx.CreatedAt)
                    .OrderByDescending(b => b.AuctionId)
                    .FirstOrDefaultAsync();

                int latestAuctionPrice = latestAuction?.CurrentPrice ?? player.PlayerOvr;
                int ovr = player.PlayerOvr;

                // We only care about cases where the transaction price (pricePaid) exceeds the auction price
                if (pricePaid <= latestAuctionPrice) continue;

                // Calculate base release price
                int basePriceExpected = latestAuctionPrice; // capped at latest auction price

                var quota = quotas.FirstOrDefault(q => ovr >= q.MinOVR && ovr <= q.MaxOVR);
                int releasePercent = quota?.ReleasePercent ?? 0;
                int expectedRefund = (int)Math.Round((double)basePriceExpected * releasePercent / 100.0);

                if (tx.Amount != expectedRefund)
                {
                    int diff = tx.Amount - expectedRefund;
                    if (diff <= 0) continue; // safety check

                    if (walletMap.TryGetValue(userId, out var wallet))
                    {
                        // Deduct the difference from the user's wallet balance
                        wallet.AvailableBalance -= diff;

                        // Create an adjustment transaction record (DEBIT)
                        var adjTx = new AuctionTransaction
                        {
                            UserId = userId,
                            Amount = diff,
                            Direction = "DEBIT",
                            Type = "ADJUSTMENT",
                            Description = $"หักเงินคืนเกินราคาประมูลตอนปล่อยตัวนักเตะ {player.PlayerName} (OVR {ovr}) ซื้อ {pricePaid} สูงกว่าราคาประมูลล่าสุด {latestAuctionPrice}",
                            BalanceAfter = wallet.AvailableBalance,
                            RelatedPlayerId = playerId,
                            CreatedAt = DateTime.UtcNow
                        };

                        db.AuctionTransactions.Add(adjTx);
                        fixedCount++;

                        _output.WriteLine($"Corrected TxID {tx.TransactionId}: Deducted {diff} TP from User {user} ({userId}) for {player.PlayerName}. New AvailableBalance: {wallet.AvailableBalance}");
                    }
                    else
                    {
                        _output.WriteLine($"WARNING: Wallet not found for User {user} ({userId}). Skip correction.");
                    }
                }
            }

            if (fixedCount > 0)
            {
                await db.SaveChangesAsync();
                await transaction.CommitAsync();
                _output.WriteLine($"Successfully applied {fixedCount} wallet/transaction corrections to the database.");
            }
            else
            {
                _output.WriteLine("No mismatches found to correct.");
                await transaction.RollbackAsync();
            }

            _output.WriteLine("==================================================");
            Assert.True(true);
        }
    }
}
