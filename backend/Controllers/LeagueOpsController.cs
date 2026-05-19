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

using eTPL.API.Models;
namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin,moderator")]
    public class LeagueOpsController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly MsSqlDbContext _scaffoldedContext;

        public LeagueOpsController(MsSqlDbContext context, MsSqlDbContext scaffoldedContext)
        {
            _context = context;
            _scaffoldedContext = scaffoldedContext;
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
                var targetMatches = await _scaffoldedContext.TbmFixtureAlls
                    .Where(f => f.Match >= cycle.MatchStartNo && f.Match <= cycle.MatchEndNo && f.Active != "CC")
                    .ToListAsync();
                
                foreach (var m in targetMatches) m.Active = "YES";
                await _scaffoldedContext.SaveChangesAsync();
            }

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
                    .Where(f => f.Match >= cycle.MatchStartNo && f.Match <= cycle.MatchEndNo && f.MatchDate == null && f.Active != "CC")
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
                    .Where(h => h.CycleId == cycleId)
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

        [HttpPost("batch-apply")]
        public async Task<IActionResult> ApplyBatchResults([FromBody] BatchApplyRequest request)
        {
            var results = request.Results;
            var cycleId = request.CycleId;

            if (results == null || !results.Any()) return BadRequest("No results provided");

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

            await _scaffoldedContext.SaveChangesAsync();
            return Ok(new { updatedCount = results.Count });
        }
    }
}

