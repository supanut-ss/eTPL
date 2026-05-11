using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.LeagueOps;
using eTPL.API.Data.Scaffolded;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Data;
using Microsoft.Data.SqlClient;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin,moderator")]
    public class LeagueOpsController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly ScaffoldedDbContext _scaffoldedContext;

        public LeagueOpsController(MsSqlDbContext context, ScaffoldedDbContext scaffoldedContext)
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
            if (cycle.Id == 0)
            {
                _context.LeagueCycles.Add(cycle);
            }
            else
            {
                _context.Entry(cycle).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();

            // Sync Match Status in TbmFixtureAll
            if (cycle.MatchStartNo > 0 && cycle.MatchEndNo >= cycle.MatchStartNo)
            {
                var targetMatches = await _scaffoldedContext.TbmFixtureAlls
                    .Where(f => f.Match >= cycle.MatchStartNo && f.Match <= cycle.MatchEndNo && f.Active != "CC")
                    .ToListAsync();
                
                foreach (var m in targetMatches)
                {
                    m.Active = "YES";
                }
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
                
                // We use raw SQL to call the SP and return as a dynamic list or DTO
                // For simplicity, we can use a dedicated DTO or dynamic
                var stats = await _context.Set<PlayerLeagueStat>().FromSqlRaw("EXEC sp_calculate_league_ops @in_int_cycle_id", cycleIdParam).ToListAsync();
                
                return Ok(stats);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("checkin")]
        public async Task<IActionResult> AddCheckin([FromBody] DailyCheckin checkin)
        {
            _context.DailyCheckins.Add(checkin);
            await _context.SaveChangesAsync();
            return Ok(checkin);
        }

        [HttpPost("autojudge/{cycleId}")]
        public async Task<IActionResult> RunAutoJudge(int cycleId)
        {
            var cycle = await _context.LeagueCycles.FindAsync(cycleId);
            if (cycle == null) return NotFound();

            var stats = await _context.Set<PlayerLeagueStat>().FromSqlRaw("EXEC sp_calculate_league_ops @in_int_cycle_id", new SqlParameter("@in_int_cycle_id", cycleId)).ToListAsync();
            var statsDict = stats.ToDictionary(s => s.user_id);

            var pendingMatches = await _scaffoldedContext.TbmFixtureAlls
                .Where(f => f.MatchDate >= cycle.StartDate && f.MatchDate <= cycle.EndDate && f.HomeScore == null && f.AwayScore == null)
                .ToListAsync();

            foreach (var match in pendingMatches)
            {
                if (match.Home == null || match.Away == null) continue;

                var statA = statsDict.GetValueOrDefault(match.Home);
                var statB = statsDict.GetValueOrDefault(match.Away);

                if (statA == null || statB == null) continue;

                if (statA.r_score < 20)
                {
                    match.HomeScore = 0;
                    match.AwayScore = 3;
                }
                else if (statB.r_score < 20)
                {
                    match.HomeScore = 3;
                    match.AwayScore = 0;
                }
                else
                {
                    decimal diff = statA.ei_score - statB.ei_score;
                    if (diff >= cycle.EiThreshold)
                    {
                        match.HomeScore = 3;
                        match.AwayScore = 0;
                    }
                    else if (diff <= -cycle.EiThreshold)
                    {
                        match.HomeScore = 0;
                        match.AwayScore = 3;
                    }
                    else
                    {
                        match.HomeScore = 0;
                        match.AwayScore = 0;
                    }
                }
            }

            await _scaffoldedContext.SaveChangesAsync();
            return Ok(new { updatedCount = pendingMatches.Count });
        }
    }
}
