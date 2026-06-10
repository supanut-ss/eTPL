using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.LeagueOps;

using eTPL.API.Models.Scaffolded;
using eTPL.API.Models.DTOs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Data;
using Microsoft.Data.SqlClient;
using System;
using System.Text.Json;
using eTPL.API.Models.Auction;

using eTPL.API.Models;
using eTPL.API.Services.Interfaces;
namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin,moderator")]
    public class LeagueOpsController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly MsSqlDbContext _scaffoldedContext;
        private readonly IDiscordService _discordService;

        public LeagueOpsController(MsSqlDbContext context, MsSqlDbContext scaffoldedContext, IDiscordService discordService)
        {
            _context = context;
            _scaffoldedContext = scaffoldedContext;
            _discordService = discordService;
        }

        [HttpGet("cycles")]
        public async Task<IActionResult> GetCycles()
        {
            var cycles = await _context.LeagueCycles.ToListAsync();
            return Ok(cycles);
        }

        [HttpPost("cycle")]
        public async Task<IActionResult> SaveCycle([FromBody] LeagueCycle cycle)
        {
            if (cycle.Id == 0) _context.LeagueCycles.Add(cycle);
            else _context.Entry(cycle).State = EntityState.Modified;

            await _context.SaveChangesAsync();

            if (cycle.MatchStartNo > 0 && cycle.MatchEndNo >= cycle.MatchStartNo)
            {
                var targetMatchesD1 = await _scaffoldedContext.TbmFixtureAlls
                    .Where(f => f.Match >= cycle.MatchStartNo && f.Match <= cycle.MatchEndNo && f.Active != "CC" && (f.Division == null || (f.Division != "D2" && f.Division != "d2")))
                    .ToListAsync();
                
                foreach (var m in targetMatchesD1) m.Active = "YES";
            }

            if (cycle.MatchStartNoD2 > 0 && cycle.MatchEndNoD2 >= cycle.MatchStartNoD2)
            {
                var targetMatchesD2 = await _scaffoldedContext.TbmFixtureAlls
                    .Where(f => f.Match >= cycle.MatchStartNoD2 && f.Match <= cycle.MatchEndNoD2 && f.Active != "CC" && (f.Division == "D2" || f.Division == "d2"))
                    .ToListAsync();
                
                foreach (var m in targetMatchesD2) m.Active = "YES";
            }

            await _scaffoldedContext.SaveChangesAsync();

            return Ok(cycle);
        }

        [HttpGet("cycle/{id}/stats")]
        public async Task<IActionResult> GetCycleStats(int id)
        {
            try
            {
                var cycleIdParam = new SqlParameter("@in_int_cycle_id", id);
                var stats = await _context.Set<LeagueOpsStatResult>().FromSqlRaw("EXEC sp_calculate_league_ops @in_int_cycle_id", cycleIdParam).ToListAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                var details = ex.Message + (ex.InnerException != null ? " -> " + ex.InnerException.Message : "");
                return BadRequest(new { message = "Query Stats Error", details = details });
            }
        }

        [HttpPost("checkin")]
        public async Task<IActionResult> AddCheckin([FromBody] DailyCheckin checkin)
        {
            _context.DailyCheckins.Add(checkin);
            await _context.SaveChangesAsync();
            return Ok(checkin);
        }

        [HttpPost("user-checkin")]
        [AllowAnonymous]
        public async Task<IActionResult> UserCheckin()
        {
            if (User.Identity == null || !User.Identity.IsAuthenticated)
            {
                return Unauthorized(new { message = "กรุณาเข้าสู่ระบบก่อนรายงานตัว" });
            }

            var userId = User.Identity.Name;
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { message = "ไม่พบข้อมูลผู้ใช้" });
            }

            // Time check (17:45 - 23:45 ICT)
            var now = DateTime.UtcNow.AddHours(7);
            var startTime = new TimeSpan(17, 45, 0);
            var endTime = new TimeSpan(23, 45, 0);
            var currentTime = now.TimeOfDay;

            if (currentTime < startTime || currentTime > endTime)
            {
                return BadRequest(new { message = $"ไม่อยู่ในช่วงเวลาการรายงานตัว (17:45 - 23:45)\nเวลาเซิร์ฟเวอร์ (ICT): {now:HH:mm:ss}" });
            }

            var activeCycle = await _context.LeagueCycles.FirstOrDefaultAsync(c => c.Status == "active");
            if (activeCycle == null)
            {
                return BadRequest(new { message = "ยังไม่มีการเปิดรอบการแข่งขันในขณะนี้" });
            }

            var today = now.Date;

            var alreadyCheckedIn = await _context.DailyCheckins.AnyAsync(c => 
                c.UserId == userId && 
                c.CycleId == activeCycle.Id && 
                c.CheckinDate == today);

            if (alreadyCheckedIn)
            {
                return BadRequest(new { message = "วันนี้คุณได้รายงานตัวไปแล้ว" });
            }

            var checkin = new DailyCheckin
            {
                UserId = userId,
                CycleId = activeCycle.Id,
                CheckinDate = today,
                IsReady = true
            };

            _context.DailyCheckins.Add(checkin);
            await _context.SaveChangesAsync();

            // Retrieve user profile name for Discord notification
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            string userName = user?.LineName ?? userId;
            string datetimeStr = now.ToString("yyyy-MM-dd HH:mm:ss");

            // Notify Discord (new check-in only)
            try
            {
                await _discordService.SendCustomEmbedAsync(
                    "PLAYER CHECK-IN",
                    $"👤 **{userName}** รายงานตัวแล้ว ✅ (ผ่านหน้าเว็บ 🌐)\n🕐 **เวลา:** {datetimeStr}",
                    0xff9913
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending check-in Discord notification: {ex.Message}");
            }

            return Ok(new { message = "รายงานตัวสำเร็จ", checkin = checkin });
        }

        [HttpGet("user-checkin-status")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserCheckinStatus()
        {
            if (User.Identity == null || !User.Identity.IsAuthenticated)
            {
                return Ok(new { isCheckedIn = false, isAuthenticated = false });
            }

            var userId = User.Identity.Name;
            if (string.IsNullOrEmpty(userId))
            {
                return Ok(new { isCheckedIn = false, isAuthenticated = false });
            }

            var activeCycle = await _context.LeagueCycles.FirstOrDefaultAsync(c => c.Status == "active");
            if (activeCycle == null)
            {
                return Ok(new { isCheckedIn = false, isAuthenticated = true, noActiveCycle = true });
            }

            var now = DateTime.UtcNow.AddHours(7);
            var today = now.Date;
            var currentTime = now.TimeOfDay;
            var startTime = new TimeSpan(17, 45, 0);
            var endTime = new TimeSpan(23, 45, 0);
            var isWithinHours = currentTime >= startTime && currentTime <= endTime;

            var alreadyCheckedIn = await _context.DailyCheckins.AnyAsync(c => 
                c.UserId == userId && 
                c.CycleId == activeCycle.Id && 
                c.CheckinDate == today);

            return Ok(new { 
                isCheckedIn = alreadyCheckedIn, 
                isAuthenticated = true,
                isWithinHours = isWithinHours,
                serverTime = now.ToString("HH:mm:ss")
            });
        }





        [HttpGet("autojudge/{cycleId}/preview")]
        public async Task<IActionResult> GetAutoJudgePreview(int cycleId)
        {
            try
            {
                var cycle = await _context.LeagueCycles.FindAsync(cycleId);
                if (cycle == null) return NotFound(new { message = "Cycle not found" });

                var rawStats = await _context.Set<LeagueOpsStatResult>()
                    .FromSqlRaw("EXEC sp_calculate_league_ops @in_int_cycle_id", new SqlParameter("@in_int_cycle_id", cycleId))
                    .ToListAsync();
                
                var statsDict = rawStats.GroupBy(s => s.user_id, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

                var pendingMatches = await _scaffoldedContext.TbmFixtureAlls
                    .Where(f => f.MatchDate == null && f.Active != "CC" && (
                        ((f.Division == null || (f.Division != "D2" && f.Division != "d2")) && f.Match >= cycle.MatchStartNo && f.Match <= cycle.MatchEndNo) ||
                        ((f.Division == "D2" || f.Division == "d2") && f.Match >= cycle.MatchStartNoD2 && f.Match <= cycle.MatchEndNoD2)
                    ))
                    .ToListAsync();

                var suggestions = pendingMatches.Select(match => {
                    if (string.IsNullOrEmpty(match.Home) || string.IsNullOrEmpty(match.Away)) return null;
                    var statA = statsDict.GetValueOrDefault(match.Home);
                    var statB = statsDict.GetValueOrDefault(match.Away);
                    if (statA == null || statB == null) return null;

                    int h = 0, a = 0;
                    string reason = "";
                    decimal rA = statA.r_score ?? 0;
                    decimal rB = statB.r_score ?? 0;
                    decimal eiA = statA.ei_score ?? 0;
                    decimal eiB = statB.ei_score ?? 0;

                    decimal diff = eiA - eiB;
                    if (diff >= (decimal)cycle.EiThreshold) { h = 3; a = 0; reason = "ความสม่ำเสมอสูงกว่าชัดเจน (Home Win)"; }
                    else if (diff <= -(decimal)cycle.EiThreshold) { h = 0; a = 3; reason = "ความสม่ำเสมอสูงกว่าชัดเจน (Away Win)"; }
                    else { h = 0; a = 0; reason = "ความสม่ำเสมอสูสีกัน (Balanced Draw)"; }

                    return new {
                        fixtureId = match.FixtureId,
                        home = match.Home,
                        away = match.Away,
                        suggestedHomeScore = h,
                        suggestedAwayScore = a,
                        reason = reason
                    };
                }).Where(x => x != null).ToList();

                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Preview Error", details = ex.Message });
            }
        }

        [HttpGet("history/{cycleId}")]
        public async Task<IActionResult> GetHistory(int cycleId)
        {
            try
            {
                var history = await _context.JudgeHistories
                    //.Where(h => h.CycleId == cycleId)
                    .OrderByDescending(h => h.JudgeDate)
                    .ToListAsync();
                return Ok(history);
            }
            catch (Exception ex)
            {
                // Most likely table doesn't exist
                return BadRequest(new { message = "History Query Error", details = ex.Message });
            }
        }

        [HttpDelete("history/{id}")]
        public async Task<IActionResult> DeleteHistory(int id)
        {
            var history = await _context.JudgeHistories.FindAsync(id);
            if (history == null) return NotFound();

            _context.JudgeHistories.Remove(history);
            await _context.SaveChangesAsync();
            return Ok(new { message = "History deleted" });
        }

        [HttpDelete("cycle/{id}")]
        public async Task<IActionResult> DeleteCycle(int id)
        {
            var cycle = await _context.LeagueCycles.FindAsync(id);
            if (cycle == null) return NotFound(new { message = "Cycle not found" });

            _context.LeagueCycles.Remove(cycle);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Cycle deleted successfully" });
        }


        [HttpPost("batch-apply")]
        public async Task<IActionResult> ApplyBatchResults([FromBody] BatchApplyRequest request)
        {
            var results = request.Results;
            var cycleId = request.CycleId;

            if (results == null || !results.Any()) return BadRequest("No results provided");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        // Record history before applying (to capture the snapshot)
                        var cycle = await _context.LeagueCycles.FindAsync(cycleId);
                        if (cycle != null)
                        {
                            var adminId = User.Identity?.Name ?? "system";
                            var history = new JudgeHistory
                            {
                                CycleId = cycleId,
                                JudgeDate = DateTime.Now,
                                ConfigSnapshot = request.ConfigSnapshot ?? JsonSerializer.Serialize(cycle),
                                MatchCount = results.Count,
                                AdminId = adminId
                            };
                            _context.JudgeHistories.Add(history);
                            await _context.SaveChangesAsync();
                        }

                        // 2. Dynamic Bonus Payout (Run calculations BEFORE saving the adjusted matches)
                        var payouts = new List<PayoutSummaryDto>();
                        var stats = await _context.Set<LeagueOpsStatResult>()
                            .FromSqlRaw("EXEC sp_calculate_league_ops @in_int_cycle_id", new SqlParameter("@in_int_cycle_id", cycleId))
                            .ToListAsync();

                        foreach (var stat in stats)
                        {
                            if (stat.est_bonus == null || stat.est_bonus <= 0) continue;

                            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == stat.user_id);
                            if (user == null) continue;

                            // Check if already paid for this cycle
                            bool alreadyPaid = await _context.AuctionTransactions.AnyAsync(t => 
                                t.UserId == user.Id && 
                                t.Type == "CYCLE_BONUS" && 
                                t.Description.Contains($"Cycle {cycleId}"));

                            int bonusAmount = (int)Math.Round(stat.est_bonus.Value, MidpointRounding.AwayFromZero);

                            if (alreadyPaid)
                            {
                                payouts.Add(new PayoutSummaryDto
                                {
                                    UserId = user.UserId,
                                    DisplayName = user.LineName ?? user.UserId,
                                    Amount = bonusAmount,
                                    Tier = stat.tier ?? "UNKNOWN",
                                    AlreadyPaid = true
                                });
                            }
                            else
                            {
                                var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == user.Id);
                                if (wallet == null)
                                {
                                    wallet = new AuctionUserWallet
                                    {
                                        UserId = user.Id,
                                        AvailableBalance = 0,
                                        ReservedBalance = 0
                                    };
                                    _context.AuctionUserWallets.Add(wallet);
                                    await _context.SaveChangesAsync(); // generate WalletId
                                }

                                wallet.AvailableBalance += bonusAmount;

                                var tx = new AuctionTransaction
                                {
                                    UserId = user.Id,
                                    Amount = bonusAmount,
                                    Direction = "CREDIT",
                                    Type = "CYCLE_BONUS",
                                    Description = $"Cycle End Bonus (Cycle {cycleId}) - {stat.tier ?? "UNKNOWN"}",
                                    BalanceAfter = wallet.AvailableBalance,
                                    CreatedAt = DateTime.UtcNow
                                };
                                _context.AuctionTransactions.Add(tx);

                                payouts.Add(new PayoutSummaryDto
                                {
                                    UserId = user.UserId,
                                    DisplayName = user.LineName ?? user.UserId,
                                    Amount = bonusAmount,
                                    Tier = stat.tier ?? "UNKNOWN",
                                    AlreadyPaid = false
                                });
                            }
                        }

                        // 3. Save Match Results and Standings (AFTER dynamic bonus calculation)
                        foreach (var item in results)
                        {
                            var match = await _scaffoldedContext.TbmFixtureAlls.FirstOrDefaultAsync(f => f.FixtureId == item.FixtureId);
                            if (match == null) continue;

                            match.HomeScore = item.HomeScore;
                            match.AwayScore = item.AwayScore;
                            match.Active = "YES";
                            match.MatchDate = DateTime.Now;

                            // 1. Log
                            var existingLog = await _scaffoldedContext.TblFixtureLogs.FirstOrDefaultAsync(l => l.FixtureId == match.FixtureId);
                            if (existingLog != null)
                            {
                                existingLog.HomeScore = match.HomeScore;
                                existingLog.AwayScore = match.AwayScore;
                                existingLog.Active = "YES";
                                existingLog.MatchDate = DateTime.Now;
                            }
                            else
                            {
                                await _scaffoldedContext.TblFixtureLogs.AddAsync(new TblFixtureLog
                                {
                                    FixtureId = match.FixtureId,
                                    Division = match.Division,
                                    Match = match.Match,
                                    Home = match.Home,
                                    Away = match.Away,
                                    HomeScore = match.HomeScore,
                                    AwayScore = match.AwayScore,
                                    Active = "YES",
                                    Season = match.Season,
                                    MatchDate = DateTime.Now,
                                    Platform = match.Platform
                                });
                            }

                            // 2. Standing
                            int hW = 0, hD = 0, hL = 0, hPts = 0;
                            int aW = 0, aD = 0, aL = 0, aPts = 0;

                            if (match.HomeScore > match.AwayScore) { hW = 1; hPts = 3; aL = 1; }
                            else if (match.HomeScore == match.AwayScore) { hD = 1; hPts = 1; aD = 1; aPts = 1; }
                            else { hL = 1; aW = 1; aPts = 3; }

                            await _scaffoldedContext.TbtResults.AddAsync(new TbtResult
                            {
                                Id = Guid.NewGuid().ToString(),
                                FixtureId = match.FixtureId,
                                Division = match.Division,
                                Team = match.Home,
                                Pl = 1, W = hW, D = hD, L = hL,
                                Gf = match.HomeScore, Ga = match.AwayScore, Gd = match.HomeScore - match.AwayScore,
                                Pts = hPts, Season = match.Season, Platform = match.Platform, CreateDate = DateTime.Now
                            });

                            await _scaffoldedContext.TbtResults.AddAsync(new TbtResult
                            {
                                Id = Guid.NewGuid().ToString(),
                                FixtureId = match.FixtureId,
                                Division = match.Division,
                                Team = match.Away,
                                Pl = 1, W = aW, D = aD, L = aL,
                                Gf = match.AwayScore, Ga = match.HomeScore, Gd = match.AwayScore - match.HomeScore,
                                Pts = aPts, Season = match.Season, Platform = match.Platform, CreateDate = DateTime.Now
                            });
                        }

                        // Save everything to DB context
                        await _context.SaveChangesAsync();
                        await _scaffoldedContext.SaveChangesAsync();

                        await transaction.CommitAsync();

                        return Ok(new { updatedCount = results.Count, payouts = payouts });
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        var details = ex.Message + (ex.InnerException != null ? " -> " + ex.InnerException.Message : "");
                        return BadRequest(new { message = "An error occurred while applying results and payouts.", details = details });
                    }
                }
            });
        }

        [HttpPost("retroactive-payout/{cycleId}")]
        public async Task<IActionResult> RetroactivePayout(int cycleId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        var cycle = await _context.LeagueCycles.FindAsync(cycleId);
                        if (cycle == null) return NotFound(new { message = "Cycle not found" });

                        // Find the JudgeHistory for this cycle to determine when matches were adjusted
                        var history = await _context.JudgeHistories
                            .Where(h => h.CycleId == cycleId)
                            .OrderByDescending(h => h.JudgeDate)
                            .FirstOrDefaultAsync();

                        var adjustedMatches = new List<TbmFixtureAll>();
                        var originalScores = new List<(string FixtureId, int? HomeScore, int? AwayScore, DateTime? MatchDate, string? Active)>();

                        if (history != null)
                        {
                            // Find matches in this cycle's range that were adjusted in this batch (within 2 minutes of JudgeDate)
                            var minDate = history.JudgeDate.AddMinutes(-2);
                            var maxDate = history.JudgeDate.AddMinutes(2);

                            adjustedMatches = await _context.TbmFixtureAlls
                                .Where(f => f.MatchDate >= minDate && f.MatchDate <= maxDate && f.Active == "YES" &&
                                           (((f.Division == null || (f.Division != "D2" && f.Division != "d2")) && f.Match >= cycle.MatchStartNo && f.Match <= cycle.MatchEndNo) ||
                                            ((f.Division == "D2" || f.Division == "d2") && f.Match >= cycle.MatchStartNoD2 && f.Match <= cycle.MatchEndNoD2)))
                                .ToListAsync();

                            foreach (var m in adjustedMatches)
                            {
                                originalScores.Add((m.FixtureId, m.HomeScore, m.AwayScore, m.MatchDate, m.Active));

                                // Temporarily set to null (unplayed state)
                                m.HomeScore = null;
                                m.AwayScore = null;
                                m.MatchDate = null;
                            }

                            if (adjustedMatches.Any())
                            {
                                await _context.SaveChangesAsync();
                            }
                        }

                        // Run calculations on the temporarily nulled out database state
                        var payouts = new List<PayoutSummaryDto>();
                        var stats = await _context.Set<LeagueOpsStatResult>()
                            .FromSqlRaw("EXEC sp_calculate_league_ops @in_int_cycle_id", new SqlParameter("@in_int_cycle_id", cycleId))
                            .ToListAsync();

                        foreach (var stat in stats)
                        {
                            if (stat.est_bonus == null || stat.est_bonus <= 0) continue;

                            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == stat.user_id);
                            if (user == null) continue;

                            // Check if already paid for this cycle
                            bool alreadyPaid = await _context.AuctionTransactions.AnyAsync(t => 
                                t.UserId == user.Id && 
                                t.Type == "CYCLE_BONUS" && 
                                t.Description.Contains($"Cycle {cycleId}"));

                            int bonusAmount = (int)Math.Round(stat.est_bonus.Value, MidpointRounding.AwayFromZero);

                            if (alreadyPaid)
                            {
                                payouts.Add(new PayoutSummaryDto
                                {
                                    UserId = user.UserId,
                                    DisplayName = user.LineName ?? user.UserId,
                                    Amount = bonusAmount,
                                    Tier = stat.tier ?? "UNKNOWN",
                                    AlreadyPaid = true
                                });
                            }
                            else
                            {
                                var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == user.Id);
                                if (wallet == null)
                                {
                                    wallet = new AuctionUserWallet
                                    {
                                        UserId = user.Id,
                                        AvailableBalance = 0,
                                        ReservedBalance = 0
                                    };
                                    _context.AuctionUserWallets.Add(wallet);
                                    await _context.SaveChangesAsync(); // generate WalletId
                                }

                                wallet.AvailableBalance += bonusAmount;

                                var tx = new AuctionTransaction
                                {
                                    UserId = user.Id,
                                    Amount = bonusAmount,
                                    Direction = "CREDIT",
                                    Type = "CYCLE_BONUS",
                                    Description = $"Cycle End Bonus (Cycle {cycleId}) - {stat.tier ?? "UNKNOWN"}",
                                    BalanceAfter = wallet.AvailableBalance,
                                    CreatedAt = DateTime.UtcNow
                                };
                                _context.AuctionTransactions.Add(tx);

                                payouts.Add(new PayoutSummaryDto
                                {
                                    UserId = user.UserId,
                                    DisplayName = user.LineName ?? user.UserId,
                                    Amount = bonusAmount,
                                    Tier = stat.tier ?? "UNKNOWN",
                                    AlreadyPaid = false
                                });
                            }
                        }

                        // Restore original adjusted matches
                        if (adjustedMatches.Any())
                        {
                            foreach (var m in adjustedMatches)
                            {
                                var orig = originalScores.First(o => o.FixtureId == m.FixtureId);
                                m.HomeScore = orig.HomeScore;
                                m.AwayScore = orig.AwayScore;
                                m.MatchDate = orig.MatchDate;
                                m.Active = orig.Active;
                            }
                            await _context.SaveChangesAsync();
                        }

                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        return Ok(new { payouts = payouts });
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        var details = ex.Message + (ex.InnerException != null ? " -> " + ex.InnerException.Message : "");
                        return BadRequest(new { message = "An error occurred while retroactively distributing payouts.", details = details });
                    }
                }
            });
        }

        [HttpPost("cut-player/{userId}")]
        public async Task<IActionResult> CutPlayer(string userId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) return NotFound(new { message = "User not found in the system." });

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        // 1. ลบผลการแข่งขันในตาราง tbt_result
                        var fixtures = await _context.TbmFixtureAlls
                            .Where(f => f.Home == userId || f.Away == userId)
                            .ToListAsync();

                        var fixtureIds = fixtures.Select(f => f.FixtureId).ToList();

                        var results = await _context.TbtResults
                            .Where(r => r.FixtureId != null && fixtureIds.Contains(r.FixtureId))
                            .ToListAsync();
                        if (results.Any())
                        {
                            _context.TbtResults.RemoveRange(results);
                        }

                        // 2. แก้ ACTIVE = 'CC' ในตาราง tbt_fixture_all (และ clear scores/dates)
                        foreach (var f in fixtures)
                        {
                            f.Active = "CC";
                        }
                        _context.TbmFixtureAlls.UpdateRange(fixtures);

                        // 3. คืนนักเตะทั้งหมดเข้าตลาด
                        var userSquad = await _context.AuctionSquads.Where(s => s.UserId == user.Id).ToListAsync();
                        var squadIds = userSquad.Select(s => s.SquadId).ToList();

                        var relatedOffers = await _context.TransferOffers
                            .Where(o => o.FromUserId == user.Id || o.ToUserId == user.Id || squadIds.Contains(o.SquadId))
                            .ToListAsync();
                        if (relatedOffers.Any()) _context.TransferOffers.RemoveRange(relatedOffers);

                        if (userSquad.Any()) _context.AuctionSquads.RemoveRange(userSquad);

                        // 4. ลบข้อมูลการเงินทั้งหมดที่เกี่ยวข้อง
                        var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == user.Id);
                        if (wallet != null) _context.AuctionUserWallets.Remove(wallet);

                        var trans = await _context.AuctionTransactions.Where(t => t.UserId == user.Id).ToListAsync();
                        if (trans.Any()) _context.AuctionTransactions.RemoveRange(trans);

                        // Active/completed auctions involving the user
                        var winningAuctions = await _context.AuctionBoards.Where(a => a.HighestBidderId == user.Id).ToListAsync();
                        foreach (var wa in winningAuctions)
                        {
                            wa.HighestBidderId = null;
                        }

                        var userBids = await _context.AuctionBidLogs.Where(b => b.UserId == user.Id).ToListAsync();
                        if (userBids.Any()) _context.AuctionBidLogs.RemoveRange(userBids);

                        var initiatedAuctions = await _context.AuctionBoards.Where(a => a.InitiatorUserId == user.Id).ToListAsync();
                        if (initiatedAuctions.Any())
                        {
                            var auctionIds = initiatedAuctions.Select(a => a.AuctionId).ToList();
                            var logsOnInitiatedAuctions = await _context.AuctionBidLogs.Where(b => auctionIds.Contains(b.AuctionId)).ToListAsync();
                            if (logsOnInitiatedAuctions.Any()) _context.AuctionBidLogs.RemoveRange(logsOnInitiatedAuctions);
                            
                            _context.AuctionBoards.RemoveRange(initiatedAuctions);
                        }

                        var bonuses = await _context.SpecialBonuses.Where(b => b.UserId == user.Id).ToListAsync();
                        if (bonuses.Any()) _context.SpecialBonuses.RemoveRange(bonuses);

                        var checkins = await _context.DailyCheckins.Where(c => c.UserId == user.UserId).ToListAsync();
                        if (checkins.Any()) _context.DailyCheckins.RemoveRange(checkins);

                        var legacyTeams = await _context.TbmTeams.Where(t => t.UserId == user.Id).ToListAsync();
                        if (legacyTeams.Any()) _context.TbmTeams.RemoveRange(legacyTeams);

                        var notifications = await _context.Notifications.Where(n => n.UserId == user.Id).ToListAsync();
                        if (notifications.Any()) _context.Notifications.RemoveRange(notifications);

                        var favourites = await _context.AuctionFavourites.Where(f => f.UserId == user.Id).ToListAsync();
                        if (favourites.Any()) _context.AuctionFavourites.RemoveRange(favourites);

                        // 5. ลบข้อมูลในตาราง user
                        _context.Users.Remove(user);

                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        return Ok(new { message = $"Successfully cut player {userId} from the competition." });
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        var details = ex.Message + (ex.InnerException != null ? " -> " + ex.InnerException.Message : "");
                        return BadRequest(new { message = "An error occurred while cutting the player.", details = details });
                    }
                }
            });
        }
    }
}

