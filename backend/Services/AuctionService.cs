using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Auction;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class AuctionService : IAuctionService
    {
        private readonly MsSqlDbContext _context;

        public AuctionService(MsSqlDbContext context)
        {
            _context = context;
        }

        private DateTime GetThaiTime() => DateTime.UtcNow.AddHours(7);

        private async Task CheckTimeEligibilityAsync()
        {
            var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
            if (settings == null) throw new Exception("Auction settings not found.");

            var thaiTime = GetThaiTime();
            
            if (settings.AuctionStartDate.HasValue && thaiTime.Date < settings.AuctionStartDate.Value.Date)
                throw new Exception("ยังไม่ถึงช่วงวันที่เปิดประมูล");
            
            if (settings.AuctionEndDate.HasValue && thaiTime.Date > settings.AuctionEndDate.Value.Date)
                throw new Exception("หมดช่วงวันที่เปิดประมูลแล้ว");

            if (thaiTime.TimeOfDay < settings.DailyBidStartTime || thaiTime.TimeOfDay > settings.DailyBidEndTime)
                throw new Exception($"อนุญาตให้ประมูลได้ตั้งแต่ {settings.DailyBidStartTime:hh\\:mm} ถึง {settings.DailyBidEndTime:hh\\:mm} (เวลาไทย) เท่านั้น");
        }

        private async Task ValidateBidEligibility(int userId, int bidAmount, int playerOvr)
        {
            await CheckTimeEligibilityAsync();

            var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
            if (settings == null) throw new Exception("Auction settings not found.");

            // Get winning count + squad count
            var currentSquadCount = await _context.AuctionSquads.CountAsync(s => s.UserId == userId);
            var winningCount = await _context.AuctionBoards
                .Where(b => b.DbStatus == "Active" && b.HighestBidderId == userId && b.FinalEndTime > DateTime.UtcNow)
                .CountAsync();

            var totalOwnedAndWinning = currentSquadCount + winningCount;

            // 1. Max Squad Size Check
            if (totalOwnedAndWinning >= settings.MaxSquadSize)
                throw new Exception($"ขนาดทีมสูงสุดคือ {settings.MaxSquadSize} คน (รวมที่กำลังชนะประมูล)");

            // 2. Budget Lock Check
            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null) throw new Exception("Wallet not found.");

            int remainingSlotsToFill = settings.MaxSquadSize - totalOwnedAndWinning - 1; 
            int requiredReserve = remainingSlotsToFill > 0 ? remainingSlotsToFill * settings.MinBidPrice : 0;

            if (wallet.AvailableBalance - bidAmount < requiredReserve)
                throw new Exception($"Budget Lock: ต้องเหลือเงินอย่างน้อย {requiredReserve} สำหรับซื้ออีก {remainingSlotsToFill} ตำแหน่งด้วยราคาขั้นต่ำ");

            // 3. Grade Quota Check
            var quotas = await _context.AuctionGradeQuotas.ToListAsync();
            var targetGrade = quotas.FirstOrDefault(q => playerOvr >= q.MinOVR && playerOvr <= q.MaxOVR);
            
            if (targetGrade != null && targetGrade.MaxAllowedPerUser < 99)
            {
                var squadOVRs = await _context.AuctionSquads
                    .Where(s => s.UserId == userId)
                    .Select(s => s.Player!.PlayerOvr)
                    .ToListAsync();
                    
                var winningOVRs = await _context.AuctionBoards
                    .Where(b => b.DbStatus == "Active" && b.HighestBidderId == userId && b.FinalEndTime > DateTime.UtcNow)
                    .Select(b => b.Player!.PlayerOvr)
                    .ToListAsync();

                var allOVRs = squadOVRs.Concat(winningOVRs);
                var currentGradeCount = allOVRs.Count(ovr => ovr >= targetGrade.MinOVR && ovr <= targetGrade.MaxOVR);

                if (currentGradeCount >= targetGrade.MaxAllowedPerUser)
                    throw new Exception($"โควตาเกรด {targetGrade.GradeName} เต็มแล้ว (สูงสุด {targetGrade.MaxAllowedPerUser} คน)");
            }
        }

        private AuctionBoardDto MapToDto(AuctionBoard board)
        {
            var dto = new AuctionBoardDto
            {
                AuctionId = board.AuctionId,
                PlayerId = board.PlayerId,
                PlayerName = board.Player?.PlayerName ?? "Unknown",
                PlayerOvr = board.Player?.PlayerOvr ?? 0,
                CurrentPrice = board.CurrentPrice,
                HighestBidderId = board.HighestBidderId,
                HighestBidderName = board.HighestBidder?.UserId, // The string username from User table
                NormalEndTime = DateTime.SpecifyKind(board.NormalEndTime, DateTimeKind.Utc),
                FinalEndTime = DateTime.SpecifyKind(board.FinalEndTime, DateTimeKind.Utc),
                DbStatus = board.DbStatus
            };

            var now = DateTime.UtcNow;
            if (board.DbStatus != "Active")
                dto.DisplayStatus = board.DbStatus;
            else if (now < board.NormalEndTime)
                dto.DisplayStatus = "Normal Bid";
            else if (now >= board.NormalEndTime && now < board.FinalEndTime)
                dto.DisplayStatus = "Final Bid";
            else if (now >= board.FinalEndTime && now < board.FinalEndTime.AddHours(24))
                dto.DisplayStatus = "Waiting Confirm";
            else
                dto.DisplayStatus = "Expired";

            return dto;
        }

        public async Task RunLazySweepAsync()
        {
            var expiredAuctions = await _context.AuctionBoards
                .Where(b => b.DbStatus == "Active" && DateTime.UtcNow >= b.FinalEndTime.AddHours(24))
                .ToListAsync();

            if (!expiredAuctions.Any()) return;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var auction in expiredAuctions)
                {
                    auction.DbStatus = "Cancelled";
                    
                    var finalBids = await _context.AuctionBidLogs
                        .Where(l => l.AuctionId == auction.AuctionId && l.Phase == "Final")
                        .ToListAsync();
                    
                    // Refund Normal leader's normal bid
                    if (auction.HighestBidderId.HasValue)
                    {
                        var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == auction.HighestBidderId.Value);
                        if (wallet != null)
                        {
                            wallet.AvailableBalance += auction.CurrentPrice;
                            wallet.ReservedBalance -= auction.CurrentPrice;
                        }
                    }

                    // Refund all final bids
                    foreach (var bid in finalBids)
                    {
                        var bidderWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == bid.UserId);
                        // To refund their Final bid fully, we need to refund the `actualDeduction` they paid!
                        if (bidderWallet != null)
                        {
                            int refundAmount = bid.BidAmount;
                            if (auction.HighestBidderId == bid.UserId)
                            {
                                refundAmount = bid.BidAmount - auction.CurrentPrice;
                            }

                            bidderWallet.AvailableBalance += refundAmount;
                            bidderWallet.ReservedBalance -= refundAmount;
                        }
                    }
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResultDto<PlayerSearchResultDto>> SearchPlayersAsync(string searchTerm, int page, int pageSize, bool freeAgentOnly = false, string? grade = null)
        {
            var query = _context.PesPlayerTeams.Where(p => p.PlayerOvr >= 60);

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(p => p.PlayerName.Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(grade) && grade != "All")
            {
                int minOvr = 0, maxOvr = 99;
                switch (grade.ToUpper())
                {
                    case "S": minOvr = 82; maxOvr = 99; break;
                    case "A": minOvr = 81; maxOvr = 81; break;
                    case "B": minOvr = 79; maxOvr = 80; break;
                    case "C": minOvr = 77; maxOvr = 78; break;
                    case "D": minOvr = 75; maxOvr = 76; break;
                    case "E": minOvr = 65; maxOvr = 74; break;
                }
                if (minOvr > 0)
                {
                    query = query.Where(p => p.PlayerOvr >= minOvr && p.PlayerOvr <= maxOvr);
                }
            }

            if (freeAgentOnly)
            {
                var currentTime = DateTime.UtcNow;
                query = query.Where(p => 
                    !_context.AuctionSquads.Any(s => s.PlayerId == p.IdPlayer) &&
                    !_context.AuctionBoards.Any(b => b.PlayerId == p.IdPlayer && b.DbStatus == "Active" && currentTime >= b.NormalEndTime)
                );
            }

            var total = await query.CountAsync();
            var players = await query.OrderByDescending(p => p.PlayerOvr)
                                     .Skip((page - 1) * pageSize)
                                     .Take(pageSize)
                                     .ToListAsync();

            var playerIds = players.Select(p => p.IdPlayer).ToList();

            // Get active auctions for these players
            var activeAuctions = await _context.AuctionBoards
                .Include(b => b.HighestBidder)
                .Where(b => b.DbStatus == "Active" && playerIds.Contains(b.PlayerId))
                .ToListAsync();

            // Get squads for these players
            var squadEntries = await _context.AuctionSquads
                .Include(s => s.User)
                .Where(s => playerIds.Contains(s.PlayerId))
                .ToListAsync();

            // Get sold auctions (to find winner name for squad entries)
            var soldAuctions = await _context.AuctionBoards
                .Include(b => b.HighestBidder)
                .Where(b => b.DbStatus == "Sold" && playerIds.Contains(b.PlayerId))
                .ToListAsync();

            var now = DateTime.UtcNow;

            var items = players.Select(p =>
            {
                var result = new PlayerSearchResultDto
                {
                    IdPlayer = p.IdPlayer,
                    PlayerName = p.PlayerName,
                    PlayerOvr = p.PlayerOvr,
                    Status = "Available"
                };

                // Check if in squad (Won)
                var squadEntry = squadEntries.FirstOrDefault(s => s.PlayerId == p.IdPlayer);
                if (squadEntry != null)
                {
                    result.Status = "Won";
                    var soldBoard = soldAuctions.FirstOrDefault(b => b.PlayerId == p.IdPlayer);
                    result.WinnerName = soldBoard?.HighestBidder?.UserId ?? squadEntry.User?.UserId ?? "Unknown";
                    return result;
                }

                // Check active auction
                var activeBoard = activeAuctions.FirstOrDefault(a => a.PlayerId == p.IdPlayer);
                if (activeBoard != null)
                {
                    result.ActiveAuctionId = activeBoard.AuctionId;
                    result.CurrentPrice = activeBoard.CurrentPrice;

                    if (now < activeBoard.NormalEndTime)
                        result.Status = "In Normal Bid";
                    else if (now >= activeBoard.NormalEndTime && now < activeBoard.FinalEndTime)
                        result.Status = "In Final Bid";
                    else
                        result.Status = "In Normal Bid"; // fallback
                }

                return result;
            }).ToList();

            return new PagedResultDto<PlayerSearchResultDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<AuctionBoardDto> StartAuctionAsync(int playerId, int initiatorUserId)
        {
            await RunLazySweepAsync();
            await CheckTimeEligibilityAsync();

            var player = await _context.PesPlayerTeams.FindAsync(playerId);
            if (player == null || player.PlayerOvr < 60) throw new Exception("นักเตะไม่ถูกต้อง หรือ OVR ต่ำกว่า 60");

            bool exists = await _context.AuctionBoards.AnyAsync(b => b.PlayerId == playerId && b.DbStatus == "Active");
            if (exists) throw new Exception("นักเตะคนนี้กำลังถูกประมูลอยู่");

            var inSquad = await _context.AuctionSquads.AnyAsync(s => s.PlayerId == playerId);
            if (inSquad) throw new Exception("นักเตะคนนี้ถูกประมูลไปแล้ว");

            var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
            int startPrice = player.PlayerOvr;

            await ValidateBidEligibility(initiatorUserId, startPrice, player.PlayerOvr);

            var auction = new AuctionBoard
            {
                PlayerId = playerId,
                InitiatorUserId = initiatorUserId,
                CurrentPrice = startPrice - 1,
                NormalEndTime = DateTime.UtcNow.AddHours(20),
                FinalEndTime = DateTime.UtcNow.AddHours(24),
                DbStatus = "Active"
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.AuctionBoards.Add(auction);
                await _context.SaveChangesAsync();

                var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == initiatorUserId);
                if (wallet == null) throw new Exception("Wallet not found.");
                
                wallet.AvailableBalance -= startPrice;
                wallet.ReservedBalance += startPrice;

                auction.HighestBidderId = initiatorUserId;
                auction.CurrentPrice = startPrice;

                _context.AuctionBidLogs.Add(new AuctionBidLog
                {
                    AuctionId = auction.AuctionId,
                    UserId = initiatorUserId,
                    BidAmount = startPrice,
                    Phase = "Normal",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            auction = await _context.AuctionBoards
                .Include(a => a.Player)
                .Include(a => a.HighestBidder)
                .FirstOrDefaultAsync(a => a.AuctionId == auction.AuctionId);

            return MapToDto(auction!);
        }

        public async Task<List<AuctionBoardDto>> GetActiveAuctionsAsync()
        {
            await RunLazySweepAsync();
            var boards = await _context.AuctionBoards
                .Include(b => b.Player)
                .Include(b => b.HighestBidder)
                .Where(b => b.DbStatus == "Active")
                .ToListAsync();

            var auctionIds = boards.Select(b => b.AuctionId).ToList();

            var distinctBids = await _context.AuctionBidLogs
                .Where(l => auctionIds.Contains(l.AuctionId))
                .Select(l => new { l.AuctionId, l.UserId })
                .Distinct()
                .ToListAsync();

            var bidderMap = distinctBids
                .GroupBy(l => l.AuctionId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(l => l.UserId).ToList()
                );

            var dtos = boards.Select(b =>
            {
                var dto = MapToDto(b);
                dto.BidderUserIds = bidderMap.ContainsKey(b.AuctionId) ? bidderMap[b.AuctionId] : new List<int>();
                return dto;
            }).ToList();

            return dtos;
        }

        public async Task<AuctionBoardDto> PlaceNormalBidAsync(int auctionId, int userId, int bidAmount)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .Include(b => b.HighestBidder)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) throw new Exception("Auction not found.");

                var dto = MapToDto(auction);
                if (dto.DisplayStatus != "Normal Bid") throw new Exception("ไม่อยู่ในช่วง Normal Bid.");

                if (auction.HighestBidderId == userId) throw new Exception("ไม่สามารถบิดทับตัวเองที่กำลังนำอยู่ได้");

                if (bidAmount <= auction.CurrentPrice) throw new Exception("ราคาที่บิดต้องมากกว่าราคาปัจจุบัน");
                if (bidAmount != auction.CurrentPrice + 1) throw new Exception("บิดช่วง Normal เพิ่มได้ทีละ 1 เท่านั้น");

                await ValidateBidEligibility(userId, bidAmount, auction.Player!.PlayerOvr);

                var newBidderWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId);
                if (newBidderWallet == null) throw new Exception("Wallet not found.");

                // Refund old winner
                if (auction.HighestBidderId.HasValue)
                {
                    var prevWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == auction.HighestBidderId.Value);
                    if (prevWallet != null)
                    {
                        prevWallet.AvailableBalance += auction.CurrentPrice;
                        prevWallet.ReservedBalance -= auction.CurrentPrice;
                    }
                }

                // Deduct new winner
                newBidderWallet.AvailableBalance -= bidAmount;
                newBidderWallet.ReservedBalance += bidAmount;

                auction.HighestBidderId = userId;
                auction.CurrentPrice = bidAmount;

                _context.AuctionBidLogs.Add(new AuctionBidLog
                {
                    AuctionId = auctionId,
                    UserId = userId,
                    BidAmount = bidAmount,
                    Phase = "Normal",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return MapToDto(auction);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new Exception("Conflict: มีคนบิดไปแล้ว โปรดลองใหม่");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<AuctionBoardDto> PlaceFinalBidAsync(int auctionId, int userId, int bidAmount)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) throw new Exception("Auction not found.");

                var dto = MapToDto(auction);
                if (dto.DisplayStatus != "Final Bid") throw new Exception("ไม่อยู่ในช่วง Final Bid.");

                var hasNormalBid = await _context.AuctionBidLogs.AnyAsync(l => l.AuctionId == auctionId && l.UserId == userId && l.Phase == "Normal");
                if (!hasNormalBid) throw new Exception("เฉพาะผู้ที่เคยบิดในช่วง Normal เท่านั้นถึงจะมีสิทธิ์บิดในช่วง Final");

                var hasFinalBid = await _context.AuctionBidLogs.AnyAsync(l => l.AuctionId == auctionId && l.UserId == userId && l.Phase == "Final");
                if (hasFinalBid) throw new Exception("คุณได้เสนอราคาบิดปิดผนึกไปแล้ว");

                if (bidAmount <= auction.CurrentPrice) throw new Exception("ราคาปิดผนึกต้องสูงกว่าราคาปัจจุบัน");

                await ValidateBidEligibility(userId, bidAmount, auction.Player!.PlayerOvr);

                var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId);
                if (wallet == null) throw new Exception("Wallet not found.");

                int actualDeduction = bidAmount;
                if (auction.HighestBidderId == userId)
                {
                    actualDeduction = bidAmount - auction.CurrentPrice;
                }

                wallet.AvailableBalance -= actualDeduction;
                wallet.ReservedBalance += actualDeduction;

                _context.AuctionBidLogs.Add(new AuctionBidLog
                {
                    AuctionId = auctionId,
                    UserId = userId,
                    BidAmount = bidAmount,
                    Phase = "Final",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return MapToDto(auction);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new Exception("Conflict: Server กำลังจัดการข้อมูล");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<AuctionBoardDto> ConfirmAuctionAsync(int auctionId, int userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) throw new Exception("Auction not found.");

                var dto = MapToDto(auction);
                if (dto.DisplayStatus != "Waiting Confirm") throw new Exception("ไม่อยู่ในช่วงที่ต้องกดยืนยัน");

                var finalBids = await _context.AuctionBidLogs
                    .Where(l => l.AuctionId == auctionId && l.Phase == "Final")
                    .OrderByDescending(l => l.BidAmount)
                    .ThenBy(l => l.CreatedAt)
                    .ToListAsync();
                
                int? winnerId = null;
                int winningPrice = auction.CurrentPrice;

                if (finalBids.Any())
                {
                    winnerId = finalBids.First().UserId;
                    winningPrice = finalBids.First().BidAmount;
                }
                else if (auction.HighestBidderId.HasValue)
                {
                    winnerId = auction.HighestBidderId.Value;
                    winningPrice = auction.CurrentPrice;
                }

                if (!winnerId.HasValue) throw new Exception("ไม่มีผู้ชนะ");
                if (winnerId.Value != userId) throw new Exception("คุณไม่ใช่ผู้ชนะประมูลนี้");

                // Refund losers
                if (auction.HighestBidderId.HasValue && auction.HighestBidderId.Value != winnerId.Value)
                {
                    var oldWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == auction.HighestBidderId.Value);
                    if (oldWallet != null)
                    {
                        oldWallet.AvailableBalance += auction.CurrentPrice;
                        oldWallet.ReservedBalance -= auction.CurrentPrice;
                    }
                }

                foreach (var bid in finalBids)
                {
                    if (bid.UserId != winnerId.Value)
                    {
                        var loserWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == bid.UserId);
                        if (loserWallet != null)
                        {
                            int refundAmount = bid.BidAmount;
                            if (auction.HighestBidderId == bid.UserId)
                            {
                                refundAmount = bid.BidAmount - auction.CurrentPrice;
                            }
                            loserWallet.AvailableBalance += refundAmount;
                            loserWallet.ReservedBalance -= refundAmount;
                        }
                    }
                }

                auction.DbStatus = "Sold";
                auction.HighestBidderId = winnerId;
                auction.CurrentPrice = winningPrice;

                var winnerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == winnerId.Value);
                if (winnerWallet != null)
                {
                    // Deduct permanently the winning amount
                    // Wait! If winner was Normal leader, they already paid CurrentPrice, and (winningPrice - CurrentPrice).
                    // Either way, the TOTAL reserved amount for them was winningPrice!
                    // So we just deduct winningPrice unconditionally from ReservedBalance.
                    winnerWallet.ReservedBalance -= winningPrice;
                }

                _context.AuctionSquads.Add(new AuctionSquad
                {
                    UserId = winnerId.Value,
                    PlayerId = auction.PlayerId
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return MapToDto(auction);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new Exception(ex.Message);
            }
        }

        public async Task<AuctionWalletDto> GetWalletAsync(int userId)
        {
            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
            {
                var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
                wallet = new AuctionUserWallet { UserId = userId, AvailableBalance = settings?.StartingBudget ?? 2000, ReservedBalance = 0 };
                _context.AuctionUserWallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            return new AuctionWalletDto
            {
                UserId = wallet.UserId,
                AvailableBalance = wallet.AvailableBalance,
                ReservedBalance = wallet.ReservedBalance
            };
        }

        public async Task<UserAuctionSummaryDto> GetUserSummaryAsync(int userId)
        {
            var walletDto = await GetWalletAsync(userId);
            var settings = await _context.AuctionSettings.FirstOrDefaultAsync() ?? new AuctionSetting();
            
            var squad = await _context.AuctionSquads
                .Include(s => s.Player)
                .Where(s => s.UserId == userId)
                .ToListAsync();
            
            var winning = await _context.AuctionBoards
                .Include(b => b.Player)
                .Where(b => b.DbStatus == "Active" && b.HighestBidderId == userId && b.FinalEndTime > DateTime.UtcNow)
                .ToListAsync();

            var currentSquadCount = squad.Count + winning.Count;
            int remainingSlots = settings.MaxSquadSize - currentSquadCount - 1;
            int required = remainingSlots > 0 ? remainingSlots * settings.MinBidPrice : 0;

            var summary = new UserAuctionSummaryDto
            {
                Wallet = walletDto,
                CurrentSquadCount = currentSquadCount,
                MaxSquadSize = settings.MaxSquadSize,
                RequiredReserve = required,
                Squad = squad.Select(s => new AuctionSquadDto
                {
                    PlayerId = s.PlayerId,
                    PlayerName = s.Player!.PlayerName,
                    PlayerOvr = s.Player.PlayerOvr
                }).ToList()
            };

            var quotas = await _context.AuctionGradeQuotas.ToListAsync();
            var allOVRs = squad.Select(s => s.Player!.PlayerOvr).Concat(winning.Select(b => b.Player!.PlayerOvr)).ToList();

            foreach (var q in quotas)
            {
                summary.Quotas.Add(new GradeQuotaUsageDto
                {
                    GradeName = q.GradeName,
                    MaxAllowed = q.MaxAllowedPerUser,
                    CurrentCount = allOVRs.Count(o => o >= q.MinOVR && o <= q.MaxOVR)
                });
            }

            return summary;
        }

        public async Task<List<AuctionSquadDto>> GetMySquadAsync(int userId)
        {
            var squad = await _context.AuctionSquads
                .Include(s => s.Player)
                .Where(s => s.UserId == userId)
                .ToListAsync();

            var playerIds = squad.Select(s => s.PlayerId).ToList();

            // Find sold auctions to get actual price paid
            var soldAuctions = await _context.AuctionBoards
                .Where(b => b.DbStatus == "Sold" && playerIds.Contains(b.PlayerId) && b.HighestBidderId == userId)
                .ToListAsync();

            var priceMap = soldAuctions
                .GroupBy(b => b.PlayerId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(b => b.AuctionId).First().CurrentPrice);

            return squad.Select(s => new AuctionSquadDto
            {
                PlayerId = s.PlayerId,
                PlayerName = s.Player?.PlayerName ?? "Unknown",
                PlayerOvr = s.Player?.PlayerOvr ?? 0,
                PricePaid = priceMap.ContainsKey(s.PlayerId) ? priceMap[s.PlayerId] : null
            }).OrderByDescending(s => s.PlayerOvr).ToList();
        }
    }
}
