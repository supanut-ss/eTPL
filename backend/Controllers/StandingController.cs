using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/standings")]
    [Authorize]
    public class StandingController : ControllerBase
    {
        private readonly ScaffoldedDbContext _db;

        public StandingController(ScaffoldedDbContext db)
        {
            _db = db;
        }

        // GET api/standings — ตารางคะแนน PC · D1 · season ปัจจุบัน
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VResultTableNews
                .Where(r => r.Division == "D1" && r.Platform == "PC");

            if (currentSeason.HasValue)
                query = query.Where(r => r.Season == currentSeason.Value);

            var data = await query
                .OrderByDescending(r => r.Pts)
                .ThenByDescending(r => r.Gd)
                .ThenByDescending(r => r.Gf)
                .ToListAsync();

            // Aggregate yellow/red cards per team from tbl_fixture_log
            var logQuery = _db.TblFixtureLogs
                .Where(l => l.Division == "D1" && l.Platform == "PC");

            if (currentSeason.HasValue)
                logQuery = logQuery.Where(l => l.Season == currentSeason.Value);

            var logs = await logQuery.ToListAsync();

            // Sum cards: each team can appear as Home or Away
            var cardTotals = new Dictionary<string, (int Yellow, int Red)>();
            foreach (var log in logs)
            {
                if (log.Home != null)
                {
                    if (!cardTotals.ContainsKey(log.Home))
                        cardTotals[log.Home] = (0, 0);
                    var (hy, hr) = cardTotals[log.Home];
                    cardTotals[log.Home] = (hy + (log.HomeYellow ?? 0), hr + (log.HomeRed ?? 0));
                }
                if (log.Away != null)
                {
                    if (!cardTotals.ContainsKey(log.Away))
                        cardTotals[log.Away] = (0, 0);
                    var (ay, ar) = cardTotals[log.Away];
                    cardTotals[log.Away] = (ay + (log.AwayYellow ?? 0), ar + (log.AwayRed ?? 0));
                }
            }

            var result = data.Select(r =>
            {
                // r.Team is the userId (e.g. "TLE_BERLIN"), same as Home/Away in fixture log
                cardTotals.TryGetValue(r.Team ?? "", out var cards);
                return new
                {
                    r.Id,
                    r.Team,
                    r.Pl,
                    r.W,
                    r.D,
                    r.L,
                    r.Gf,
                    r.Ga,
                    r.Gd,
                    r.Pts,
                    r.Division,
                    r.TeamName,
                    r.Image,
                    r.Season,
                    r.Last,
                    r.Platform,
                    TotalYellow = cards.Yellow,
                    TotalRed = cards.Red,
                };
            }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }
    }
}
