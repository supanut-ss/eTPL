using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Auction;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;


namespace eTPL.API.Services
{
    public class AuctionService : IAuctionService
    {
        private readonly MsSqlDbContext _context;

        public async Task<PlayerFilterOptionsDto> GetPlayerFilterOptionsAsync(string? league = null)
        {
            var targetQuota = await _context.AuctionGradeQuotas.FirstOrDefaultAsync(q => q.GradeName == "E");
            int minOvr = targetQuota?.MinOVR ?? 65;

            var baseQuery = _context.PesPlayerTeams.Where(x => x.PlayerOvr >= minOvr);

            var teamQuery = baseQuery;
            if (!string.IsNullOrEmpty(league))
            {
                teamQuery = teamQuery.Where(x => x.League == league);
            }

            var result = new PlayerFilterOptionsDto
            {
                Leagues = await baseQuery.Where(x => x.League != null && x.League != "").Select(x => x.League!).Distinct().OrderBy(x => x).ToListAsync(),
                Teams = await teamQuery.Where(x => x.TeamName != null && x.TeamName != "").Select(x => x.TeamName!).Distinct().OrderBy(x => x).ToListAsync(),
                Positions = await baseQuery.Where(x => x.Position != null && x.Position != "").Select(x => x.Position!).Distinct().OrderBy(x => x).ToListAsync(),
                PlayingStyles = await baseQuery.Where(x => x.PlayingStyle != null && x.PlayingStyle != "").Select(x => x.PlayingStyle!).Distinct().OrderBy(x => x).ToListAsync(),
                Feet = await baseQuery.Where(x => x.Foot != null && x.Foot != "").Select(x => x.Foot!).Distinct().OrderBy(x => x).ToListAsync(),
                Nationalities = await baseQuery.Where(x => x.Nationality != null && x.Nationality != "").Select(x => x.Nationality!).Distinct().OrderBy(x => x).ToListAsync()
            };
            return result;
        }

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

        private async Task<List<AuctionBoard>> GetUserWinningAuctionsInternalAsync(int userId)
        {
            var now = DateTime.UtcNow;
            
            // Get all active auctions where user is highest bidder OR has a final bid
            var involvedAuctions = await _context.AuctionBoards
                .Include(b => b.Player)
                .Where(b => b.DbStatus == "Active" && 
                       (b.HighestBidderId == userId || _context.AuctionBidLogs.Any(l => l.AuctionId == b.AuctionId && l.UserId == userId && l.Phase == "Final")))
                .ToListAsync();

            if (!involvedAuctions.Any()) return new List<AuctionBoard>();

            var auctionIds = involvedAuctions.Select(a => a.AuctionId).ToList();
            var allFinalBids = await _context.AuctionBidLogs
                .Where(l => auctionIds.Contains(l.AuctionId) && l.Phase == "Final")
                .ToListAsync();

            var winnersList = new List<AuctionBoard>();
            foreach (var board in involvedAuctions)
            {
                int? winnerId = board.HighestBidderId;
                
                // If it's time for Final Bid or later, and there are multiple potential winners
                // (Note: in our logic, we only care about real winners once Normal phase is over)
                if (now >= board.NormalEndTime)
                {
                    var bidsForThis = allFinalBids.Where(l => l.AuctionId == board.AuctionId)
                        .OrderByDescending(l => l.BidAmount)
                        .ThenByDescending(l => l.UserId == board.HighestBidderId)
                        .ThenBy(l => l.CreatedAt)
                        .ToList();

                    if (bidsForThis.Any())
                    {
                        winnerId = bidsForThis.First().UserId;
                    }
                }

                if (winnerId == userId)
                {
                    winnersList.Add(board);
                }
            }

            return winnersList;
        }

        private async Task ValidateBidEligibility(int userId, int bidAmount, int playerOvr, int? excludeAuctionId = null)
        {
            await CheckTimeEligibilityAsync();

            var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
            if (settings == null) throw new Exception("Auction settings not found.");

            // Get winning count + squad count
            var currentSquadCount = await _context.AuctionSquads.CountAsync(s => s.UserId == userId && s.Status != "Loaned");
            var winningAuctions = await GetUserWinningAuctionsInternalAsync(userId);
            var winningCount = winningAuctions.Count(a => a.AuctionId != (excludeAuctionId ?? 0));

            var totalOwnedAndWinning = currentSquadCount + winningCount;

            // 1. Max Squad Size Check
            if (totalOwnedAndWinning >= settings.MaxSquadSize)
                throw new Exception($"ขนาดทีมสูงสุดคือ {settings.MaxSquadSize} คน (รวมที่กำลังชนะประมูล)");

            // 2. Budget Lock Check
            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null) throw new Exception("Wallet not found.");

            var quotas = await _context.AuctionGradeQuotas.ToListAsync();
            var gradeE = quotas.FirstOrDefault(q => q.GradeName == "E");
            int lowestPrice = (gradeE?.MinOVR ?? 65) + 1;

            int remainingSlotsToFill = settings.MaxSquadSize - totalOwnedAndWinning - 1; 
            int requiredReserve = remainingSlotsToFill > 0 ? remainingSlotsToFill * lowestPrice : 0;

            if (wallet.AvailableBalance - bidAmount < requiredReserve)
                throw new Exception($"Budget Lock: ต้องเหลือเงินอย่างน้อย {requiredReserve} สำหรับซื้ออีก {remainingSlotsToFill} ตำแหน่งด้วยราคาเกรด {gradeE?.GradeName ?? "E"} +1 ({lowestPrice} TP)");

            // 3. Grade Quota Check
            var targetGrade = quotas.FirstOrDefault(q => playerOvr >= q.MinOVR && playerOvr <= q.MaxOVR);
            
            if (targetGrade != null && targetGrade.MaxAllowedPerUser < 99)
            {
                var squadOVRs = await _context.AuctionSquads
                    .Where(s => s.UserId == userId && s.Status != "Loaned") // Exclude loaned-out, Include loaned-in
                    .Select(s => s.Player!.PlayerOvr)
                    .ToListAsync();
                    
                var winningOVRs = winningAuctions
                    .Where(a => a.AuctionId != excludeAuctionId && a.Player != null)
                    .Select(a => a.Player!.PlayerOvr)
                    .ToList();

                var allOVRs = squadOVRs.Concat(winningOVRs);
                var currentGradeCount = allOVRs.Count(ovr => ovr >= targetGrade.MinOVR && ovr <= targetGrade.MaxOVR);

                if (currentGradeCount >= targetGrade.MaxAllowedPerUser)
                    throw new Exception($"โควตาเกรด {targetGrade.GradeName} เต็มแล้ว (สูงสุด {targetGrade.MaxAllowedPerUser} คน)");
            }
        }

        private AuctionBoardDto MapToDto(AuctionBoard board, int bidderCount = 1, int? winnerId = null, int? winPrice = null)
        {
            var dto = new AuctionBoardDto
            {
                AuctionId = board.AuctionId,
                PlayerId = board.PlayerId,
                PlayerName = board.Player?.PlayerName ?? "Unknown",
                PlayerOvr = board.Player?.PlayerOvr ?? 0,
                CurrentPrice = winPrice ?? board.CurrentPrice,
                HighestBidderId = board.HighestBidderId,
                HighestBidderName = board.HighestBidder?.UserId, // The string username from User table
                NormalEndTime = DateTime.SpecifyKind(board.NormalEndTime, DateTimeKind.Utc),
                FinalEndTime = DateTime.SpecifyKind(board.FinalEndTime, DateTimeKind.Utc),
                DbStatus = board.DbStatus,
                WinnerId = winnerId ?? board.HighestBidderId
            };

            var now = DateTime.UtcNow;
            if (board.DbStatus != "Active")
                dto.DisplayStatus = board.DbStatus;
            else if (now < board.NormalEndTime)
                dto.DisplayStatus = "Normal Bid";
            else if (now >= board.NormalEndTime && now < board.FinalEndTime)
            {
                if (bidderCount <= 1)
                    dto.DisplayStatus = "Waiting Confirm";
                else
                    dto.DisplayStatus = "Final Bid";
            }
            else if (now >= board.FinalEndTime && now < board.FinalEndTime.AddHours(24))
                dto.DisplayStatus = "Waiting Confirm";
            else
                dto.DisplayStatus = "Expired";

            dto.CurrentPhaseEndTime = (dto.DisplayStatus == "Normal Bid") 
                ? dto.NormalEndTime 
                : (bidderCount > 1 ? dto.FinalEndTime : dto.NormalEndTime);

            return dto;
        }

        public async Task<int> FixStuckAuctionsAsync()
        {
            // Find auctions where the timeline is inverted (FinalEndTime <= NormalEndTime)
            // These are stuck on "Normal Bid" forever because of a previous bug
            var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
            var finalDuration = settings?.FinalBidDurationMinutes ?? 240;

            var stuckAuctions = await _context.AuctionBoards
                .Where(b => b.DbStatus == "Active" && b.FinalEndTime <= b.NormalEndTime)
                .ToListAsync();

            if (!stuckAuctions.Any()) return 0;

            var now = DateTime.UtcNow;
            foreach (var a in stuckAuctions)
            {
                // Expire the Normal phase immediately (1 second in the past)
                a.NormalEndTime = now.AddSeconds(-1);
                // Give a fresh Final Bid window from now
                a.FinalEndTime = now.AddMinutes(finalDuration);
            }

            await _context.SaveChangesAsync();
            return stuckAuctions.Count;
        }

        public async Task RunLazySweepAsync()
        {
            var expiredAuctions = await _context.AuctionBoards
                .Where(b => b.DbStatus == "Active" && DateTime.UtcNow >= b.FinalEndTime.AddHours(24))
                .ToListAsync();

            if (!expiredAuctions.Any()) return;

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
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
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task<PagedResultDto<PlayerSearchResultDto>> SearchPlayersAsync(
            string? searchTerm = null, 
            int page = 1, 
            int pageSize = 20, 
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
            int? maxAge = null,
            bool ownedOnly = false,
            int? excludeUserId = null)
        {
            var query = _context.PesPlayerTeams.Where(p => p.PlayerOvr >= 60);

            if (ownedOnly)
            {
                // Exclude loaned players (both lender and borrower records)
                var ownedQuery = _context.AuctionSquads.Where(s => s.Status != "Loaned" && !s.IsLoan);
                if (excludeUserId.HasValue)
                {
                    ownedQuery = ownedQuery.Where(s => s.UserId != excludeUserId.Value);
                }
                query = query.Where(p => ownedQuery.Any(s => s.PlayerId == p.IdPlayer));
            }

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(p => p.PlayerName.Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(league))
            {
                query = query.Where(p => p.League == league);
            }
            if (!string.IsNullOrEmpty(teamName))
            {
                query = query.Where(p => p.TeamName == teamName);
            }

            if (!string.IsNullOrEmpty(position))
            {
                query = query.Where(p => p.Position == position);
            }

            if (!string.IsNullOrEmpty(playingStyle))
            {
                query = query.Where(p => p.PlayingStyle == playingStyle);
            }

            if (!string.IsNullOrEmpty(foot))
            {
                query = query.Where(p => p.Foot == foot);
            }

            if (!string.IsNullOrEmpty(nationality))
            {
                query = query.Where(p => p.Nationality == nationality);
            }

            if (minHeight.HasValue)
            {
                query = query.Where(p => p.Height >= minHeight.Value);
            }
            if (maxHeight.HasValue)
            {
                query = query.Where(p => p.Height <= maxHeight.Value);
            }

            if (minWeight.HasValue)
            {
                query = query.Where(p => p.Weight >= minWeight.Value);
            }
            if (maxWeight.HasValue)
            {
                query = query.Where(p => p.Weight <= maxWeight.Value);
            }

            if (minAge.HasValue)
            {
                query = query.Where(p => p.Age >= minAge.Value);
            }
            if (maxAge.HasValue)
            {
                query = query.Where(p => p.Age <= maxAge.Value);
            }

            if (!string.IsNullOrEmpty(grade) && grade != "All")
            {
                var targetQuota = await _context.AuctionGradeQuotas.FirstOrDefaultAsync(q => q.GradeName == grade);
                if (targetQuota != null)
                {
                    query = query.Where(p => p.PlayerOvr >= targetQuota.MinOVR && p.PlayerOvr <= targetQuota.MaxOVR);
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

            var auctionIds = activeAuctions.Select(a => a.AuctionId).ToList();
            var bidderCounts = await _context.AuctionBidLogs
                .Where(l => auctionIds.Contains(l.AuctionId))
                .GroupBy(l => l.AuctionId)
                .Select(g => new { AuctionId = g.Key, Count = g.Select(l => l.UserId).Distinct().Count() })
                .ToDictionaryAsync(x => x.AuctionId, x => x.Count);

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
            var allGrades = await _context.AuctionGradeQuotas.ToListAsync();

            var items = players.Select(p =>
            {
                var grade = allGrades.FirstOrDefault(g => p.PlayerOvr >= g.MinOVR && p.PlayerOvr <= g.MaxOVR)?.GradeName ?? "E";
                
                var result = new PlayerSearchResultDto
                {
                    IdPlayer = p.IdPlayer,
                    PlayerName = p.PlayerName,
                    PlayerOvr = p.PlayerOvr,
                    Grade = grade,
                    Status = "Available",
                    League = p.League,
                    TeamName = p.TeamName,
                    Position = p.Position,
                    PlayingStyle = p.PlayingStyle,
                    Foot = p.Foot,
                    Nationality = p.Nationality,
                    Height = p.Height,
                    Weight = p.Weight,
                    Age = p.Age
                };
                // Check if in squad (Won)
                // If the player is loaned, there are two entries. Prioritize the one that is currently "Active" (borrower).
                var playerSquads = squadEntries.Where(s => s.PlayerId == p.IdPlayer).ToList();
                var squadEntry = playerSquads.FirstOrDefault(s => s.Status == "Active") ?? playerSquads.FirstOrDefault();

                if (squadEntry != null)
                {
                    result.Status = "Won";
                    result.SquadId = squadEntry.SquadId;
                    result.OwnedByUserId = squadEntry.UserId;

                    var latestSoldBoard = soldAuctions
                        .Where(b => b.PlayerId == p.IdPlayer)
                        .OrderByDescending(b => b.FinalEndTime)
                        .FirstOrDefault();

                    // Use current squad owner as the absolute truth for ownership
                    result.WinnerName = squadEntry.User?.LineName 
                                     ?? squadEntry.User?.UserId
                                     ?? latestSoldBoard?.HighestBidder?.LineName 
                                     ?? latestSoldBoard?.HighestBidder?.UserId 
                                     ?? "Unknown";
                    
                    // Use sold board price as fallback for PricePaid if squad record is 0
                    result.PricePaid = (squadEntry.PricePaid == 0 && latestSoldBoard != null) 
                                       ? latestSoldBoard.CurrentPrice 
                                       : squadEntry.PricePaid;

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
            int startPrice = player.PlayerOvr + 1;

            await ValidateBidEligibility(initiatorUserId, startPrice, player.PlayerOvr);

            var auction = new AuctionBoard
            {
                PlayerId = playerId,
                InitiatorUserId = initiatorUserId,
                CurrentPrice = startPrice - 1,
                NormalEndTime = DateTime.UtcNow.AddMinutes(settings?.NormalBidDurationMinutes ?? 1200),
                FinalEndTime = DateTime.UtcNow.AddMinutes(settings?.NormalBidDurationMinutes ?? 1200)
                                              .AddMinutes(settings?.FinalBidDurationMinutes ?? 240),
                DbStatus = "Active"
            };

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
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

                await RecordTransactionAsync(
                    initiatorUserId, startPrice, "DEBIT", "AUCTION_BID",
                    $"เริ่มประมูล {player.PlayerName} ราคา {startPrice} TP",
                    wallet.AvailableBalance, auction.AuctionId, player.IdPlayer);

                await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });

            auction = await _context.AuctionBoards
                .Include(a => a.Player)
                .Include(a => a.HighestBidder)
                .FirstOrDefaultAsync(a => a.AuctionId == auction.AuctionId);

            return MapToDto(auction!, 1);
        }

        public async Task<List<AuctionBoardDto>> GetActiveAuctionsAsync(int? currentUserId = null)
        {
            await RunLazySweepAsync();
            var boards = await _context.AuctionBoards
                .Include(b => b.Player)
                .Include(b => b.HighestBidder)
                .Where(b => b.DbStatus == "Active")
                .ToListAsync();

            var auctionIds = boards.Select(b => b.AuctionId).ToList();

            // Only count distinct bidders from Normal phase to decide if Final Bid is needed
            var distinctBids = await _context.AuctionBidLogs
                .Where(l => auctionIds.Contains(l.AuctionId) && l.Phase == "Normal")
                .Select(l => new { l.AuctionId, l.UserId })
                .Distinct()
                .ToListAsync();

            var bidderMap = distinctBids
                .GroupBy(l => l.AuctionId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(l => l.UserId).ToList()
                );

            // Fetch Final Bids to determine true winners for ended auctions
            var finalBidsData = await _context.AuctionBidLogs
                .Where(l => auctionIds.Contains(l.AuctionId) && l.Phase == "Final")
                .ToListAsync();

            Dictionary<int, int> currentUserFinalBids = new();
            if (currentUserId.HasValue)
            {
                currentUserFinalBids = finalBidsData
                    .Where(l => l.UserId == currentUserId.Value)
                    .ToDictionary(l => l.AuctionId, l => l.BidAmount);
            }

            var now = DateTime.UtcNow;
            var dtos = boards.Select(b =>
            {
                var bidders = bidderMap.ContainsKey(b.AuctionId) ? bidderMap[b.AuctionId] : new List<int>();
                
                // Determine winnerId
                int? winnerId = b.HighestBidderId;
                int? winningPrice = null;

                if (now >= b.NormalEndTime && bidders.Count > 1)
                {
                    var bidsForThis = finalBidsData.Where(l => l.AuctionId == b.AuctionId)
                        .OrderByDescending(l => l.BidAmount)
                        .ThenByDescending(l => l.UserId == b.HighestBidderId)
                        .ThenBy(l => l.CreatedAt)
                        .ToList();
                    
                    if (bidsForThis.Any())
                    {
                        winnerId = bidsForThis.First().UserId;
                        winningPrice = bidsForThis.First().BidAmount;
                    }
                }
                
                var dto = MapToDto(b, bidders.Count, winnerId, winningPrice);
                dto.BidderUserIds = bidders;
                dto.CurrentUserFinalBid = currentUserFinalBids.ContainsKey(b.AuctionId) ? currentUserFinalBids[b.AuctionId] : null;
                return dto;
            }).ToList();

            return dtos;
        }

        public async Task<AuctionBoardDto> PlaceNormalBidAsync(int auctionId, int userId, int bidAmount)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
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

                await ValidateBidEligibility(userId, bidAmount, auction.Player!.PlayerOvr, auctionId);

                var newBidderWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId);
                if (newBidderWallet == null) throw new Exception("Wallet not found.");

                // Refund old winner
                var prevBidderId = auction.HighestBidderId;
                var prevPrice = auction.CurrentPrice;
                if (auction.HighestBidderId.HasValue)
                {
                    var prevWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == auction.HighestBidderId.Value);
                    if (prevWallet != null)
                    {
                        prevWallet.AvailableBalance += auction.CurrentPrice;
                        prevWallet.ReservedBalance -= auction.CurrentPrice;

                        await RecordTransactionAsync(
                            auction.HighestBidderId.Value, auction.CurrentPrice, "CREDIT", "AUCTION_REFUND",
                            $"คืนเงินถูกแซงประมูล {auction.Player?.PlayerName ?? ""}",
                            prevWallet.AvailableBalance, auctionId, auction.PlayerId);
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

                await RecordTransactionAsync(
                    userId, bidAmount, "DEBIT", "AUCTION_BID",
                    $"บิด {auction.Player?.PlayerName ?? ""} ราคา {bidAmount} TP",
                    newBidderWallet.AvailableBalance, auctionId, auction.PlayerId);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var currentBiddersCount = await _context.AuctionBidLogs
                    .Where(l => l.AuctionId == auctionId)
                    .Select(l => l.UserId)
                    .Distinct()
                    .CountAsync();

                return MapToDto(auction, currentBiddersCount);
                }
                catch (DbUpdateConcurrencyException)
                {
                    throw new Exception("Conflict: มีคนบิดไปแล้ว โปรดลองใหม่");
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task<AuctionBoardDto> PlaceFinalBidAsync(int auctionId, int userId, int bidAmount)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) throw new Exception("Auction not found.");

                var bidderCount = await _context.AuctionBidLogs
                    .Where(l => l.AuctionId == auctionId && l.Phase == "Normal")
                    .Select(l => l.UserId)
                    .Distinct()
                    .CountAsync();

                var dto = MapToDto(auction, bidderCount);
                if (dto.DisplayStatus != "Final Bid") throw new Exception("ไม่อยู่ในช่วง Final Bid.");

                var hasNormalBid = await _context.AuctionBidLogs.AnyAsync(l => l.AuctionId == auctionId && l.UserId == userId && l.Phase == "Normal");
                if (!hasNormalBid) throw new Exception("เฉพาะผู้ที่เคยบิดในช่วง Normal เท่านั้นถึงจะมีสิทธิ์บิดในช่วง Final");

                var hasFinalBid = await _context.AuctionBidLogs.AnyAsync(l => l.AuctionId == auctionId && l.UserId == userId && l.Phase == "Final");
                if (hasFinalBid) throw new Exception("คุณได้เสนอราคาบิดปิดผนึกไปแล้ว");

                if (bidAmount <= auction.CurrentPrice) throw new Exception("ราคาปิดผนึกต้องสูงกว่าราคาปัจจุบัน");

                await ValidateBidEligibility(userId, bidAmount, auction.Player!.PlayerOvr, auctionId);

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

                await RecordTransactionAsync(
                    userId, actualDeduction, "DEBIT", "AUCTION_BID",
                    $"บิดปิดผนึก {auction.Player?.PlayerName ?? ""} {bidAmount} TP",
                    wallet.AvailableBalance, auctionId, auction.PlayerId);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                    
                    var currentCount = await _context.AuctionBidLogs
                        .Where(l => l.AuctionId == auctionId)
                        .Select(l => l.UserId)
                        .Distinct()
                        .CountAsync();

                    return MapToDto(auction, currentCount);
                }
                catch (DbUpdateConcurrencyException)
                {
                    throw new Exception("Conflict: มีคนบิดไปแล้ว โปรดลองใหม่");
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task<AuctionBoardDto> ConfirmAuctionAsync(int auctionId, int userId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) throw new Exception("Auction not found.");

                var bidderCount = await _context.AuctionBidLogs
                    .Where(l => l.AuctionId == auctionId && l.Phase == "Normal")
                    .Select(l => l.UserId)
                    .Distinct()
                    .CountAsync();

                var dto = MapToDto(auction, bidderCount);
                if (dto.DisplayStatus != "Waiting Confirm") throw new Exception("ไม่อยู่ในช่วงที่ต้องกดยืนยัน");

                var normalWinnerId = auction.HighestBidderId;
                
                var finalBidsList = await _context.AuctionBidLogs
                    .Where(l => l.AuctionId == auctionId && l.Phase == "Final")
                    .ToListAsync();

                var finalBids = finalBidsList
                    .OrderByDescending(l => l.BidAmount)
                    .ThenByDescending(l => l.UserId == normalWinnerId)
                    .ThenBy(l => l.CreatedAt)
                    .ToList();
                
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
                var playerName2 = auction.Player?.PlayerName ?? "";
                if (auction.HighestBidderId.HasValue && auction.HighestBidderId.Value != winnerId.Value)
                {
                    var oldWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == auction.HighestBidderId.Value);
                    if (oldWallet != null)
                    {
                        oldWallet.AvailableBalance += auction.CurrentPrice;
                        oldWallet.ReservedBalance -= auction.CurrentPrice;
                        await RecordTransactionAsync(auction.HighestBidderId.Value, auction.CurrentPrice, "CREDIT", "AUCTION_REFUND",
                            $"คืนเงินประมูลไม่ชนะ {playerName2}", oldWallet.AvailableBalance, auctionId, auction.PlayerId);
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
                            await RecordTransactionAsync(bid.UserId, refundAmount, "CREDIT", "AUCTION_REFUND",
                                $"คืนเงินประมูลไม่ชนะ {playerName2}", loserWallet.AvailableBalance, auctionId, auction.PlayerId);
                        }
                    }
                }

                auction.DbStatus = "Sold";
                auction.HighestBidderId = winnerId;
                auction.CurrentPrice = winningPrice;

                var winnerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == winnerId.Value);
                if (winnerWallet != null)
                {
                    winnerWallet.ReservedBalance -= winningPrice;
                    await RecordTransactionAsync(winnerId.Value, winningPrice, "DEBIT", "AUCTION_WIN",
                        $"ชนะประมูลได้ {playerName2} ราคา {winningPrice} TP",
                        winnerWallet.AvailableBalance, auctionId, auction.PlayerId);
                }

                var existingSquad = await _context.AuctionSquads.FirstOrDefaultAsync(s => s.UserId == winnerId.Value && s.PlayerId == auction.PlayerId);
                if (existingSquad != null)
                {
                    existingSquad.PricePaid = winningPrice;
                    existingSquad.Status = "Active";
                    existingSquad.AcquiredAt = DateTime.UtcNow;
                    existingSquad.IsLoan = false;
                    existingSquad.LoanedFromUserId = null;
                }
                else
                {
                    _context.AuctionSquads.Add(new AuctionSquad
                    {
                        UserId = winnerId.Value,
                        PlayerId = auction.PlayerId,
                        PricePaid = winningPrice,
                        AcquiredAt = DateTime.UtcNow,
                        Status = "Active"
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                    return MapToDto(auction);
                }
                catch (Exception ex)
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw new Exception(ex.Message);
                }
            });
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
            
            var winning = await GetUserWinningAuctionsInternalAsync(userId);

            // Price Recovery: Fetch sold boards to find prices for legacy squad members
            var soldBoardsRaw = await _context.AuctionBoards
                .Where(b => b.HighestBidderId == userId && b.DbStatus == "Sold")
                .OrderByDescending(b => b.FinalEndTime)
                .ToListAsync();
            
            // Group in memory to avoid EF translation issues
            var soldBoards = soldBoardsRaw
                .GroupBy(b => b.PlayerId)
                .ToDictionary(g => g.Key, g => g.First().CurrentPrice);

            var quotas = await _context.AuctionGradeQuotas.ToListAsync();
            var gradeE = quotas.FirstOrDefault(q => q.GradeName == "E");
            int lowestPriceForReserve = (gradeE?.MinOVR ?? 65) + 1;

            var currentSquadCount = squad.Count(s => s.Status != "Loaned") + winning.Count;
            int remainingSlots = settings.MaxSquadSize - currentSquadCount;
            int required = remainingSlots > 0 ? remainingSlots * lowestPriceForReserve : 0;

            var summary = new UserAuctionSummaryDto
            {
                Wallet = walletDto,
                CurrentSquadCount = currentSquadCount,
                MaxSquadSize = settings.MaxSquadSize,
                RequiredReserve = required,
                MarketStartTime = settings.DailyBidStartTime.ToString(@"hh\:mm"),
                MarketEndTime = settings.DailyBidEndTime.ToString(@"hh\:mm"),
                MarketStartDate = settings.AuctionStartDate?.ToString("dd/MM") ?? "N/A",
                MarketEndDate = settings.AuctionEndDate?.ToString("dd/MM") ?? "N/A",
                NormalBidDurationMinutes = settings.NormalBidDurationMinutes,
                Squad = squad.Select(s => new AuctionSquadDto
                {
                    SquadId = s.SquadId,
                    PlayerId = s.PlayerId,
                    PlayerName = s.Player?.PlayerName ?? "Unknown Player",
                    PlayerOvr = s.Player?.PlayerOvr ?? 0,
                    Position = s.Player?.Position,
                    // Fallback to sold board price if PricePaid is missing (0)
                    PricePaid = (s.PricePaid == 0) && soldBoards.ContainsKey(s.PlayerId) 
                                ? soldBoards[s.PlayerId] 
                                : s.PricePaid,
                    AcquiredAt = s.AcquiredAt,
                    SeasonsWithTeam = s.SeasonsWithTeam,
                    IsLoan = s.IsLoan,
                    LoanExpiry = s.LoanExpiry,
                    Status = s.Status,
                    ListingPrice = s.ListingPrice,
                    Price = s.ListingPrice,
                    PlayingStyle = s.Player?.PlayingStyle,
                    League = s.Player?.League,
                    TeamName = s.Player?.TeamName
                }).ToList()
            };

            // Use allOVRs for quota usage
            var allOVRs = squad.Where(s => s.Player != null && s.Status != "Loaned").Select(s => s.Player!.PlayerOvr)
                          .Concat(winning.Where(w => w.Player != null).Select(b => b.Player!.PlayerOvr)).ToList();

            foreach (var q in quotas)
            {
                summary.Quotas.Add(new GradeQuotaUsageDto
                {
                    GradeId = q.GradeId,
                    GradeName = q.GradeName,
                    MinOVR = q.MinOVR,
                    MaxOVR = q.MaxOVR,
                    MaxAllowed = q.MaxAllowedPerUser,
                    CurrentCount = allOVRs.Count(o => o >= q.MinOVR && o <= q.MaxOVR),
                    RenewalPercent = q.RenewalPercent,
                    ReleasePercent = q.ReleasePercent,
                    MaxSeasonsPerTeam = q.MaxSeasonsPerTeam
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
                SquadId = s.SquadId,
                PlayerId = s.PlayerId,
                PlayerName = s.Player?.PlayerName ?? "Unknown",
                PlayerOvr = s.Player?.PlayerOvr ?? 0,
                Position = s.Player?.Position,
                PricePaid = s.PricePaid > 0 ? s.PricePaid : priceMap.ContainsKey(s.PlayerId) ? priceMap[s.PlayerId] : null,
                AcquiredAt = DateTime.SpecifyKind(s.AcquiredAt, DateTimeKind.Utc),
                SeasonsWithTeam = s.SeasonsWithTeam,
                IsLoan = s.IsLoan,
                LoanExpiry = s.LoanExpiry.HasValue ? DateTime.SpecifyKind(s.LoanExpiry.Value, DateTimeKind.Utc) : null,
                Status = s.Status,
                ListingPrice = s.ListingPrice,
                PlayingStyle = s.Player?.PlayingStyle
            }).OrderByDescending(s => s.PlayerOvr).ToList();
        }

        // ─── Transaction helper ──────────────────────────────────────────────────

        private async Task RecordTransactionAsync(int userId, int amount, string direction, string type, string description, int balanceAfter, int? relatedAuctionId = null, int? relatedPlayerId = null)
        {
            _context.AuctionTransactions.Add(new AuctionTransaction
            {
                UserId = userId,
                Amount = amount,
                Direction = direction,
                Type = type,
                Description = description,
                BalanceAfter = balanceAfter,
                RelatedAuctionId = relatedAuctionId,
                RelatedPlayerId = relatedPlayerId,
                CreatedAt = DateTime.UtcNow
            });
            // Caller must save changes
        }

        // ─── Get Transactions ────────────────────────────────────────────────────

        public async Task<PagedResultDto<AuctionTransactionDto>> GetTransactionsAsync(int userId, int page = 1, int pageSize = 20)
        {
            var query = _context.AuctionTransactions.Where(t => t.UserId == userId);
            return await FetchTransactionsInternalAsync(query, page, pageSize);
        }

        public async Task<PagedResultDto<AuctionTransactionDto>> GetGlobalTransactionsAsync(int page = 1, int pageSize = 20)
        {
            var query = _context.AuctionTransactions.AsQueryable();
            return await FetchTransactionsInternalAsync(query, page, pageSize);
        }

        private async Task<PagedResultDto<AuctionTransactionDto>> FetchTransactionsInternalAsync(IQueryable<AuctionTransaction> query, int page, int pageSize)
        {
            var totalCount = await query.CountAsync();
            var txs = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var playerIds = txs.Where(t => t.RelatedPlayerId.HasValue).Select(t => t.RelatedPlayerId!.Value).Distinct().ToList();
            var players = await _context.PesPlayerTeams.Where(p => playerIds.Contains(p.IdPlayer)).ToListAsync();
            var playerMap = players.ToDictionary(p => p.IdPlayer, p => p.PlayerName);

            var userIds = txs.Select(t => t.UserId).Distinct().ToList();
            var users = await _context.Users.Where(u => userIds.Contains(u.Id)).ToListAsync();
            var userMap = users.ToDictionary(u => u.Id, u => u.UserId);

            var items = txs.Select(t => new AuctionTransactionDto
            {
                TransactionId = t.TransactionId,
                Amount = t.Amount,
                Direction = t.Direction,
                Type = t.Type,
                Description = t.Description,
                BalanceAfter = t.BalanceAfter,
                RelatedPlayerId = t.RelatedPlayerId,
                PlayerName = t.RelatedPlayerId.HasValue && playerMap.ContainsKey(t.RelatedPlayerId.Value) ? playerMap[t.RelatedPlayerId.Value] : null,
                UserName = userMap.ContainsKey(t.UserId) ? userMap[t.UserId] : "System",
                CreatedAt = DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc)
            }).ToList();

            return new PagedResultDto<AuctionTransactionDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        // ─── Squad Lifecycle Methods ─────────────────────────────────────────────

        public async Task GiveBonusAsync(int adminUserId, GiveBonusRequest request)
        {
            // Verify admin (checked in controller, but double-safety here)
            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == request.TargetUserId)
                ?? throw new Exception("Target user wallet not found.");

            wallet.AvailableBalance += request.Amount;

            await RecordTransactionAsync(
                request.TargetUserId, request.Amount, "CREDIT", "BONUS",
                $"Bonus: {request.Reason}", wallet.AvailableBalance);

            await _context.SaveChangesAsync();
        }

        public async Task ReleasePlayerAsync(int userId, ReleasePlayerRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var squad = await _context.AuctionSquads
                    .Include(s => s.Player)
                    .FirstOrDefaultAsync(s => s.SquadId == request.SquadId && s.UserId == userId)
                    ?? throw new Exception("ไม่พบนักเตะในทีมของคุณ");

                if (squad.IsLoan)
                    throw new Exception("ไม่สามารถปล่อยตัวนักเตะที่ยังอยู่ระหว่างการยืมตัวได้");
                    
                if (squad.Status == "Loaned")
                    throw new Exception("ไม่สามารถปล่อยตัวนักเตะที่กำลังให้ทีมอื่นยืมอยู่ได้");

                var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId)
                    ?? throw new Exception("Wallet not found.");

                if (request.RefundAmount > 0)
                {
                    wallet.AvailableBalance += request.RefundAmount;
                }

                var playerName = squad.Player?.PlayerName ?? "Unknown";

                // Remove any pending/existing transfer offers associated with this squad to avoid FK constraint violations
                var relatedOffers = await _context.TransferOffers.Where(o => o.SquadId == squad.SquadId).ToListAsync();
                if (relatedOffers.Any())
                {
                    _context.TransferOffers.RemoveRange(relatedOffers);
                }

                _context.AuctionSquads.Remove(squad);

                await RecordTransactionAsync(
                    userId, request.RefundAmount, "CREDIT", "FREE_RELEASE",
                    $"ปล่อย {playerName} (คืน {request.RefundAmount} TP)",
                    wallet.AvailableBalance, relatedPlayerId: squad.PlayerId);

                await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task RenewContractAsync(int userId, RenewContractRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var squad = await _context.AuctionSquads
                    .Include(s => s.Player)
                    .FirstOrDefaultAsync(s => s.SquadId == request.SquadId && s.UserId == userId)
                    ?? throw new Exception("ไม่พบนักเตะในทีมของคุณ");

                if (squad.IsLoan)
                    throw new Exception("ไม่สามารถต่อสัญญานักเตะยืมตัวได้");

                var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == userId)
                    ?? throw new Exception("Wallet not found.");

                if (wallet.AvailableBalance < request.Cost)
                    throw new Exception($"TP ไม่เพียงพอสำหรับการต่อสัญญา (ต้องการ {request.Cost} TP)");

                wallet.AvailableBalance -= request.Cost;
                squad.SeasonsWithTeam += request.AddSeasons;

                await RecordTransactionAsync(
                    userId, request.Cost, "DEBIT", "CONTRACT_RENEWAL",
                    $"ต่อสัญญา {squad.Player?.PlayerName ?? ""} เพิ่ม {request.AddSeasons} ฤดูกาล",
                    wallet.AvailableBalance, relatedPlayerId: squad.PlayerId);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task LoanPlayerAsync(int ownerUserId, LoanPlayerRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var squad = await _context.AuctionSquads
                    .Include(s => s.Player)
                    .FirstOrDefaultAsync(s => s.SquadId == request.SquadId && s.UserId == ownerUserId)
                    ?? throw new Exception("ไม่พบนักเตะในทีมของคุณ");

                if (squad.Status != "Active")
                    throw new Exception("นักเตะคนนี้ไม่พร้อมให้ยืม");

                var currentlyLoanedOut = await _context.AuctionSquads.CountAsync(s => s.UserId == ownerUserId && s.Status == "Loaned");
                if (currentlyLoanedOut >= 2)
                    throw new Exception("ทีมของคุณปล่อยยืมตัวนักเตะครบโควตา 2 คนแล้ว ไม่สามารถปล่อยยืมเพิ่มได้");

                var buyerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == request.TargetUserId)
                    ?? throw new Exception("Wallet ของทีมที่รับยืมไม่พบ");

                var ownerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == ownerUserId)
                    ?? throw new Exception("Wallet not found.");

                if (buyerWallet.AvailableBalance < request.LoanFee)
                    throw new Exception($"TP ไม่เพียงพอสำหรับค่ายืมตัว (ต้องการ {request.LoanFee} TP)");

                // Deduct from borrower, credit to lender
                buyerWallet.AvailableBalance -= request.LoanFee;
                ownerWallet.AvailableBalance += request.LoanFee;

                // Mark original squad as "Loaned"
                squad.Status = "Loaned";

                // Create new squad entry for borrower
                var playerName = squad.Player?.PlayerName ?? "Unknown";
                _context.AuctionSquads.Add(new AuctionSquad
                {
                    UserId = request.TargetUserId,
                    PlayerId = squad.PlayerId,
                    PricePaid = 0,
                    IsLoan = true,
                    LoanedFromUserId = ownerUserId,
                    LoanExpiry = request.LoanExpiry,
                    Status = "Active",
                    AcquiredAt = DateTime.UtcNow
                });

                await RecordTransactionAsync(
                    request.TargetUserId, request.LoanFee, "DEBIT", "LOAN_FEE",
                    $"ค่ายืมตัว {playerName}", buyerWallet.AvailableBalance, relatedPlayerId: squad.PlayerId);

                await RecordTransactionAsync(
                    ownerUserId, request.LoanFee, "CREDIT", "LOAN_INCOME",
                    $"รายได้ยืมตัว {playerName}", ownerWallet.AvailableBalance, relatedPlayerId: squad.PlayerId);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task TransferPlayerAsync(int sellerUserId, TransferOfferRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var squad = await _context.AuctionSquads
                    .Include(s => s.Player)
                    .FirstOrDefaultAsync(s => s.SquadId == request.SquadId && s.UserId == sellerUserId)
                    ?? throw new Exception("ไม่พบนักเตะในทีมของคุณ");

                if (squad.IsLoan)
                    throw new Exception("ไม่สามารถขายนักเตะที่ยืมตัวมาได้");

                var buyerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == request.BuyerUserId)
                    ?? throw new Exception("Wallet ของผู้ซื้อไม่พบ");

                var sellerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == sellerUserId)
                    ?? throw new Exception("Wallet not found.");

                if (buyerWallet.AvailableBalance < request.TransferFee)
                    throw new Exception($"TP ผู้ซื้อไม่เพียงพอ (ต้องการ {request.TransferFee} TP)");

                // Deduct from buyer, credit to seller
                buyerWallet.AvailableBalance -= request.TransferFee;
                sellerWallet.AvailableBalance += request.TransferFee;

                var playerName = squad.Player?.PlayerName ?? "Unknown";

                // Transfer ownership: update squad entry
                squad.UserId = request.BuyerUserId;
                squad.PricePaid = request.TransferFee;
                squad.AcquiredAt = DateTime.UtcNow;
                squad.IsLoan = false;
                squad.LoanedFromUserId = null;
                squad.LoanExpiry = null;
                squad.Status = "Active";

                await RecordTransactionAsync(
                    request.BuyerUserId, request.TransferFee, "DEBIT", "TRANSFER_BUY",
                    $"ซื้อ {playerName} ราคา {request.TransferFee} TP",
                    buyerWallet.AvailableBalance, relatedPlayerId: squad.PlayerId);

                await RecordTransactionAsync(
                    sellerUserId, request.TransferFee, "CREDIT", "TRANSFER_SELL",
                    $"ขาย {playerName} ราคา {request.TransferFee} TP",
                    sellerWallet.AvailableBalance, relatedPlayerId: squad.PlayerId);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

    // ─── Transfer Market & Offers ─────────────────────────────────────────────

        public async Task ListPlayerAsync(int userId, int squadId, int listingPrice)
        {
            var squad = await _context.AuctionSquads.FirstOrDefaultAsync(s => s.SquadId == squadId && s.UserId == userId);
            if (squad == null) throw new Exception("ไม่พบนักเตะในทีม");
            if (squad.IsLoan) throw new Exception("นักเตะยืมตัว ไม่สามารถตั้งขายได้");
            if (listingPrice <= 0) throw new Exception("ราคาตั้งขายต้องมากกว่า 0");

            squad.Status = "Listed";
            squad.ListingPrice = listingPrice;
            await _context.SaveChangesAsync();
        }

        public async Task DelistPlayerAsync(int userId, int squadId)
        {
            var squad = await _context.AuctionSquads.FirstOrDefaultAsync(s => s.SquadId == squadId && s.UserId == userId);
            if (squad == null) throw new Exception("ไม่พบนักเตะในทีม");

            squad.Status = "Active";
            squad.ListingPrice = null;
            await _context.SaveChangesAsync();
        }

        public async Task<List<AuctionSquadDto>> GetTransferBoardAsync()
        {
            var squads = await _context.AuctionSquads
                .Include(s => s.Player)
                .Include(s => s.User)
                .Where(s => s.Status == "Listed")
                .ToListAsync();

            return squads.Select(s => new AuctionSquadDto
            {
                SquadId = s.SquadId,
                PlayerId = s.PlayerId,
                PlayerName = s.Player?.PlayerName ?? "Unknown",
                PlayerOvr = s.Player?.PlayerOvr ?? 0,
                Position = s.Player?.Position,
                PricePaid = s.PricePaid,
                ListingPrice = s.ListingPrice,
                PlayingStyle = s.Player?.PlayingStyle,
                AcquiredAt = DateTime.SpecifyKind(s.AcquiredAt, DateTimeKind.Utc),
                Status = s.Status,
                OwnerId = s.UserId,
                OwnerName = s.User?.LineName ?? s.User?.UserId ?? "Unknown"
            }).OrderByDescending(s => s.PlayerOvr).ToList();
        }

        public async Task<TransferOfferDto> SubmitOfferAsync(int buyerUserId, CreateOfferRequest request)
        {
            var squad = await _context.AuctionSquads
                .Include(s => s.Player)
                .FirstOrDefaultAsync(s => s.SquadId == request.SquadId);
            if (squad == null) throw new Exception("ไม่พบนักเตะ");
            if (squad.UserId == buyerUserId) throw new Exception("คุณเป็นเจ้าของนักเตะนี้อยู่แล้ว");
            if (squad.IsLoan) throw new Exception("ไม่สามารถยื่นข้อเสนอสำหรับนักเตะที่อยู่ระหว่างการยืมตัวได้");
            if (squad.Status == "Loaned") throw new Exception("นักเตะคนนี้ถูกปล่อยยืมตัวอยู่ ไม่สามารถทำรายการได้");
            
            // Allow offering for unlisted players too, but enforce check for active offers so we don't spam
            var existingOffer = await _context.TransferOffers
                .FirstOrDefaultAsync(o => o.SquadId == request.SquadId && o.FromUserId == buyerUserId && o.Status == "Pending");
            if (existingOffer != null) throw new Exception("คุณมีข้อเสนอที่รอการตอบรับอยู่แล้วสำหรับนักเตะคนนี้");

            if (request.Amount <= 0) throw new Exception("ข้อเสนอต้องมากกว่า 0 TP");

            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == buyerUserId);
            if (wallet == null || wallet.AvailableBalance < request.Amount)
                throw new Exception("ยอดเงินคงเหลือไม่เพียงพอสำหรับการยื่นข้อเสนอ");

            var offer = new TransferOffer
            {
                SquadId = request.SquadId,
                FromUserId = buyerUserId,
                ToUserId = squad.UserId,
                OfferType = request.OfferType,
                Amount = request.Amount,
                Status = "Pending"
            };

            _context.TransferOffers.Add(offer);
            await _context.SaveChangesAsync();

            offer = await _context.TransferOffers
                .Include(o => o.FromUser).Include(o => o.ToUser).Include(o => o.Squad).ThenInclude(s => s.Player)
                .FirstOrDefaultAsync(o => o.OfferId == offer.OfferId);

            return MapOfferDto(offer!);
        }

        public async Task RespondOfferAsync(int sellerUserId, int offerId, RespondOfferRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                var offer = await _context.TransferOffers
                    .Include(o => o.FromUser)
                    .Include(o => o.Squad).ThenInclude(s => s.Player)
                    .FirstOrDefaultAsync(o => o.OfferId == offerId && o.ToUserId == sellerUserId && o.Status == "Pending");

                if (offer == null) throw new Exception("ไม่พบข้อเสนอ หรือ ข้อเสนอถูกจัดการไปแล้ว");

                if (!request.Accept)
                {
                    offer.Status = "Rejected";
                    offer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return;
                }

                // If Accept, check buyer balance! (Use AsNoTracking then Find to ensure fresh look outside cache if needed, but inside TX is usually fine)
                var buyerWallet = await _context.AuctionUserWallets.AsNoTracking().FirstOrDefaultAsync(w => w.UserId == offer.FromUserId);
                if (buyerWallet == null) 
                {
                    offer.Status = "Collapsed";
                    offer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    throw new Exception("ดีลล่ม! ไม่พบข้อมูลกระเป๋าเงินของผู้เสนอราคา");
                }

                if (buyerWallet.AvailableBalance < offer.Amount)
                {
                    offer.Status = "Collapsed"; // Deal fails because buyer lacks funds
                    offer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    throw new Exception($"ดีลล่ม! ทีมผู้เสนอ ({offer.FromUser?.LineName ?? offer.FromUserId.ToString()}) มี TP ไม่พอจ่ายค่าข้อเสนอ (มีเหลือ {buyerWallet.AvailableBalance} TP แต่ต้องการ {offer.Amount} TP)");
                }

                // Re-fetch with tracking for update
                buyerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == offer.FromUserId);


                // --- QUOTA & BUDGET LOCK CHECK for Borrower/Buyer ---
                var settings = await _context.AuctionSettings.FirstOrDefaultAsync() ?? new AuctionSetting();
                var buyerSquad = await _context.AuctionSquads
                    .Where(s => s.UserId == offer.FromUserId && s.Status != "Loaned")
                    .Include(s => s.Player)
                    .ToListAsync();
                
                var buyerWinning = await GetUserWinningAuctionsInternalAsync(offer.FromUserId);
                var totalBuyerCount = buyerSquad.Count + buyerWinning.Count;

                // 1. Max Squad Size Check
                if (totalBuyerCount >= settings.MaxSquadSize)
                {
                    offer.Status = "Collapsed";
                    offer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    throw new Exception($"ดีลล่ม! ทีมผู้เสนอ ({offer.FromUser?.LineName ?? offer.FromUserId.ToString()}) มีนักเตะครบ {settings.MaxSquadSize} คนแล้ว กรุณาแจ้งให้ผู้ซื้อไปจัดการทีมก่อน");
                }

                // 2. Budget Lock Check (Must have enough left for remaining slots)
                var quotas = await _context.AuctionGradeQuotas.ToListAsync();
                var gradeE = quotas.FirstOrDefault(q => q.GradeName == "E");
                // Use (Grade E MinOVR + 1) as the reserve price per slot (User requirement)
                int reservePricePerSlot = (gradeE?.MinOVR ?? 65) + 1; 

                int futureSquadCount = totalBuyerCount + 1; // Buyer will gain 1 player
                int remainingSlotsAfterThis = settings.MaxSquadSize - futureSquadCount;
                int requiredReserve = remainingSlotsAfterThis > 0 ? remainingSlotsAfterThis * reservePricePerSlot : 0;

                if (buyerWallet.AvailableBalance - offer.Amount < requiredReserve)
                {
                    offer.Status = "Collapsed";
                    offer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    throw new Exception($"ดีลล่ม! ทีมผู้เสนอ ({offer.FromUser?.LineName ?? offer.FromUserId.ToString()}) ติดกฎ Budget Lock (หลังจ่ายเงินต้องเหลือเงินสำรอง {requiredReserve} TP สำหรับ {remainingSlotsAfterThis} สล็อตที่เหลือ แต่ทีมนี้จะเหลือเพียง {buyerWallet.AvailableBalance - offer.Amount} TP)");
                }

                // 3. Grade Quota Check
                var targetOvr = offer.Squad!.Player!.PlayerOvr;
                var targetGrade = quotas.FirstOrDefault(q => targetOvr >= q.MinOVR && targetOvr <= q.MaxOVR);

                if (targetGrade != null && targetGrade.MaxAllowedPerUser < 99)
                {
                    var allOvr = buyerSquad.Select(s => s.Player!.PlayerOvr)
                                  .Concat(buyerWinning.Select(w => w.Player!.PlayerOvr));
                    var currentGradeCount = allOvr.Count(ovr => ovr >= targetGrade.MinOVR && ovr <= targetGrade.MaxOVR);

                    if (currentGradeCount >= targetGrade.MaxAllowedPerUser)
                    {
                        offer.Status = "Collapsed";
                        offer.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();
                        throw new Exception($"ดีลล่ม! ทีมผู้เสนอ ({offer.FromUser?.LineName ?? offer.FromUserId.ToString()}) มีโควตาเกรด {targetGrade.GradeName} เต็มแล้ว ({targetGrade.MaxAllowedPerUser} คน)");
                    }
                }

                var sellerWallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == sellerUserId);
                if (sellerWallet == null) throw new Exception("Seller Wallet not found");

                // --- BUDGET LOCK CHECK for SELLER ---
                // Selling or Loaning out increases empty slots, which increases required reserve.
                var sellerSquadCount = await _context.AuctionSquads.CountAsync(s => s.UserId == sellerUserId && s.Status != "Loaned");
                var sellerWinning = await GetUserWinningAuctionsInternalAsync(sellerUserId);
                int totalSellerActive = sellerSquadCount + sellerWinning.Count;

                int sellerFutureActive = totalSellerActive - 1; // Seller is losing 1 active player
                int sellerRemainingSlots = settings.MaxSquadSize - sellerFutureActive;
                int sellerRequiredReserve = sellerRemainingSlots > 0 ? sellerRemainingSlots * reservePricePerSlot : 0;

                if (sellerWallet.AvailableBalance + offer.Amount < sellerRequiredReserve)
                {
                    throw new Exception($"ไม่สามารถรับข้อเสนอได้: คุณต้องมีเงินสำรอง Budget Lock อย่างน้อย {sellerRequiredReserve} TP สำหรับ {sellerRemainingSlots} สล็อตที่เหลือ (ตอนนี้มี {sellerWallet.AvailableBalance} + ค่าตัว {offer.Amount} = {sellerWallet.AvailableBalance + offer.Amount} TP)");
                }

                var playerName = offer.Squad?.Player?.PlayerName ?? "Unknown";

                if (offer.OfferType == "Transfer")
                {
                    // Deduct from buyer, credit to seller
                    buyerWallet.AvailableBalance -= offer.Amount;
                    sellerWallet.AvailableBalance += offer.Amount;

                    // Transfer Ownership
                    offer.Squad!.UserId = offer.FromUserId;
                    offer.Squad.PricePaid = offer.Amount;
                    offer.Squad.AcquiredAt = DateTime.UtcNow;
                    offer.Squad.IsLoan = false;
                    offer.Squad.LoanedFromUserId = null;
                    offer.Squad.LoanExpiry = null;
                    offer.Squad.Status = "Active";
                    offer.Squad.ListingPrice = null;
                    offer.Squad.SeasonsWithTeam = 1; // Reset seasons

                    await RecordTransactionAsync(offer.FromUserId, offer.Amount, "DEBIT", "MARKET_BUY", $"ซื้อ {playerName} จากตลาด (Private) {offer.Amount} TP", buyerWallet.AvailableBalance, null, offer.Squad.PlayerId);
                    await RecordTransactionAsync(sellerUserId, offer.Amount, "CREDIT", "MARKET_SELL", $"ขาย {playerName} {offer.Amount} TP", sellerWallet.AvailableBalance, null, offer.Squad.PlayerId);
                }
                else if (offer.OfferType == "Loan")
                {
                    var currentlyLoanedOut = await _context.AuctionSquads.CountAsync(s => s.UserId == sellerUserId && s.Status == "Loaned");
                    if (currentlyLoanedOut >= 2)
                        throw new Exception("ทีมของคุณปล่อยยืมตัวนักเตะครบโควตา 2 คนแล้ว ไม่สามารถรับข้อเสนอยืมตัวเพิ่มได้");

                    // Deduct loan fee
                    buyerWallet.AvailableBalance -= offer.Amount;
                    sellerWallet.AvailableBalance += offer.Amount;

                    // Update Original Squad to Loaned
                    offer.Squad!.Status = "Loaned";

                    // Create Loan Entry for Borrower
                    _context.AuctionSquads.Add(new AuctionSquad
                    {
                        UserId = offer.FromUserId,
                        PlayerId = offer.Squad.PlayerId,
                        PricePaid = 0,
                        IsLoan = true,
                        LoanedFromUserId = sellerUserId,
                        Status = "Active",
                        AcquiredAt = DateTime.UtcNow
                    });

                    await RecordTransactionAsync(offer.FromUserId, offer.Amount, "DEBIT", "LOAN_FEE", $"ค่ายืมตัว {playerName} 1 ฤดูกาล", buyerWallet.AvailableBalance, null, offer.Squad.PlayerId);
                    await RecordTransactionAsync(sellerUserId, offer.Amount, "CREDIT", "LOAN_INCOME", $"รายได้ให้ยืม {playerName} 1 ฤดูกาล", sellerWallet.AvailableBalance, null, offer.Squad.PlayerId);
                }

                offer.Status = "Accepted";
                offer.UpdatedAt = DateTime.UtcNow;

                // Reject all other pending offers for this player
                var otherOffers = await _context.TransferOffers
                    .Where(o => o.SquadId == offer.SquadId && o.Status == "Pending" && o.OfferId != offer.OfferId)
                    .ToListAsync();
                foreach (var o in otherOffers) 
                {
                    o.Status = "Rejected";
                    o.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { /* Ignore if already committed or closed */ }
                    throw;
                }
            });
        }

        public async Task CancelOfferAsync(int buyerUserId, int offerId)
        {
            var offer = await _context.TransferOffers.FirstOrDefaultAsync(o => o.OfferId == offerId && o.FromUserId == buyerUserId && o.Status == "Pending");
            if (offer == null) throw new Exception("ไม่พบข้อเสนอ");
            
            offer.Status = "Cancelled";
            offer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<List<TransferOfferDto>> GetIncomingOffersAsync(int userId)
        {
            var offers = await _context.TransferOffers
                .Include(o => o.FromUser).Include(o => o.ToUser).Include(o => o.Squad).ThenInclude(s => s.Player)
                .Where(o => o.ToUserId == userId && o.Status == "Pending")
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return offers.Select(MapOfferDto).ToList();
        }

        public async Task<List<TransferOfferDto>> GetOutgoingOffersAsync(int userId)
        {
            var yesterday = DateTime.UtcNow.AddDays(-1);
            var offers = await _context.TransferOffers
                .Include(o => o.FromUser).Include(o => o.ToUser).Include(o => o.Squad).ThenInclude(s => s.Player)
                .Where(o => o.FromUserId == userId && (
                    o.Status == "Pending" || 
                    ((o.Status == "Rejected" || o.Status == "Collapsed" || o.Status == "Cancelled") && (o.UpdatedAt ?? o.CreatedAt) > yesterday)
                ))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return offers.Select(MapOfferDto).ToList();
        }

        public async Task HandleSeasonChangeAsync(int newSeason)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                // Find all currently loaned players that exist as borrow entries
                var activeLoans = await _context.AuctionSquads
                    .Where(s => s.IsLoan == true && s.LoanedFromUserId != null)
                    .Include(s => s.Player)
                    .ToListAsync();

                foreach (var loan in activeLoans)
                {
                    // Find original record
                    var originalSquad = await _context.AuctionSquads
                        .FirstOrDefaultAsync(s => s.PlayerId == loan.PlayerId && s.UserId == loan.LoanedFromUserId && s.Status == "Loaned");

                    if (originalSquad != null)
                    {
                        originalSquad.Status = "Active";
                    }

                    // Remove related offers
                    var relatedOffers = await _context.TransferOffers.Where(o => o.SquadId == loan.SquadId).ToListAsync();
                    if (relatedOffers.Any())
                    {
                        _context.TransferOffers.RemoveRange(relatedOffers);
                    }

                    // Delete the borrowed entry
                    _context.AuctionSquads.Remove(loan);
                }

                // Delete any pending transfer offers that might be invalidated
                var pendingOffers = await _context.TransferOffers.Where(o => o.Status == "Pending").ToListAsync();
                foreach(var offer in pendingOffers) {
                    offer.Status = "Cancelled";
                }

                await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task<List<UserDto>> GetAllClubsAsync()
        {
            var activeUserIds = await _context.AuctionSquads
                .Select(s => s.UserId)
                .Distinct()
                .ToListAsync();

            var users = await _context.Users
                .Where(u => activeUserIds.Contains(u.Id))
                .OrderBy(u => u.UserId)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    UserId = u.UserId,
                    UserLevel = u.UserLevel,
                    LineId = u.LineId,
                    LinePic = u.LinePic,
                    LineName = u.LineName
                })
                .ToListAsync();

            return users;
        }

        public async Task ResetMarketAsync()
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Clear all auction state
                    _context.AuctionTransactions.RemoveRange(_context.AuctionTransactions);
                    _context.AuctionSquads.RemoveRange(_context.AuctionSquads);
                    _context.AuctionBidLogs.RemoveRange(_context.AuctionBidLogs);
                    _context.AuctionBoards.RemoveRange(_context.AuctionBoards);
                    _context.TransferOffers.RemoveRange(_context.TransferOffers);

                    await _context.SaveChangesAsync();

                    // Reset wallets to starting budget
                    var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
                    var startingBudget = settings?.StartingBudget ?? 2000;
                    
                    var wallets = await _context.AuctionUserWallets.ToListAsync();
                    foreach (var wallet in wallets)
                    {
                        wallet.AvailableBalance = startingBudget;
                        wallet.ReservedBalance = 0;
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        private TransferOfferDto MapOfferDto(TransferOffer offer)
        {
            return new TransferOfferDto
            {
                OfferId = offer.OfferId,
                SquadId = offer.SquadId,
                PlayerId = offer.Squad?.PlayerId ?? 0,
                PlayerName = offer.Squad?.Player?.PlayerName ?? "Unknown",
                PlayerOvr = offer.Squad?.Player?.PlayerOvr ?? 0,
                FromUserId = offer.FromUserId,
                FromUserName = offer.FromUser?.LineName ?? offer.FromUser?.UserId,
                ToUserId = offer.ToUserId,
                ToUserName = offer.ToUser?.LineName ?? offer.ToUser?.UserId,
                Position = offer.Squad?.Player?.Position,
                PlayingStyle = offer.Squad?.Player?.PlayingStyle,
                OfferType = offer.OfferType,
                Amount = offer.Amount,
                Status = offer.Status,
                CreatedAt = DateTime.SpecifyKind(offer.CreatedAt, DateTimeKind.Utc),
                UpdatedAt = offer.UpdatedAt.HasValue ? DateTime.SpecifyKind(offer.UpdatedAt.Value, DateTimeKind.Utc) : (DateTime?)null
            };
        }
    }
}
