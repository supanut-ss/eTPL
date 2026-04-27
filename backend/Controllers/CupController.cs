using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Data.Scaffolded;

namespace eTPL.API.Controllers
{
    [Route("api/cup")]
    [ApiController]
    public class CupController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly ScaffoldedDbContext _scaffoldedContext;

        public CupController(MsSqlDbContext context, ScaffoldedDbContext scaffoldedContext)
        {
            _context = context;
            _scaffoldedContext = scaffoldedContext;
        }

        [HttpGet("bracket")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBracket()
        {
            var season = await _scaffoldedContext.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue) return BadRequest(new { message = "ไม่พบ Season ปัจจุบัน" });

            var fixtures = await _context.CupFixtures
                .Where(f => f.Season == season.Value)
                .OrderByDescending(f => f.Round)
                .ThenBy(f => f.MatchNo)
                .ToListAsync();

            var users = await _context.Users.ToListAsync();
            var teams = await _scaffoldedContext.TbmTeams.Where(t => t.Season == season.Value && t.Platform == "PC").ToListAsync();

            var result = fixtures.Select(f => {
                var homeUser = users.FirstOrDefault(u => u.UserId == f.HomeUserId);
                var awayUser = users.FirstOrDefault(u => u.UserId == f.AwayUserId);
                var homeTeam = teams.FirstOrDefault(t => t.UserId == homeUser?.Id);
                var awayTeam = teams.FirstOrDefault(t => t.UserId == awayUser?.Id);

                return new {
                    id = f.Id,
                    season = f.Season,
                    round = f.Round,
                    matchNo = f.MatchNo,
                    homeUserId = f.HomeUserId,
                    homeName = homeUser?.LineName ?? f.HomeUserId,
                    homeTeam = homeTeam?.TeamName,
                    awayUserId = f.AwayUserId,
                    awayName = awayUser?.LineName ?? f.AwayUserId,
                    awayTeam = awayTeam?.TeamName,
                    homeScore = f.HomeScore,
                    awayScore = f.AwayScore,
                    nextMatchId = f.NextMatchId,
                    isPlayed = f.IsPlayed,
                    isBye = f.IsBye
                };
            }).ToList();

            return Ok(new { data = result });
        }

        [HttpPost("generate")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> GenerateBracket()
        {
            var season = await _scaffoldedContext.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue) return BadRequest(new { message = "ไม่พบ Season ปัจจุบัน" });

            var existingCount = await _context.CupFixtures.CountAsync(f => f.Season == season.Value);
            if (existingCount > 0)
                return BadRequest(new { message = $"Season {season.Value} มีข้อมูลบอลถ้วยอยู่แล้ว กรุณา Reset ก่อน" });

            var players = await _context.Users
                .Where(u => u.UserLevel != "admin")
                .Select(u => u.UserId)
                .ToListAsync();

            if (players.Count < 2) return BadRequest(new { message = "ต้องมีผู้เล่นอย่างน้อย 2 คน" });

            // Randomize players
            var rng = new Random();
            players = players.OrderBy(x => rng.Next()).ToList();

            // Calculate bracket size
            int totalSlots = 2;
            while (totalSlots < players.Count) totalSlots *= 2;
            
            int byesCount = totalSlots - players.Count;
            int totalRounds = (int)Math.Log2(totalSlots);
            
            // Distribute players and byes for the first round (Round = totalSlots)
            var round1MatchesCount = totalSlots / 2;
            
            // Build the tree bottom-up
            // We'll store matches by round. Dictionary<Round (number of teams), List<CupFixture>>
            var bracket = new Dictionary<int, List<CupFixture>>();

            // Generate empty matches for all rounds
            int currentRoundTeams = totalSlots;
            while (currentRoundTeams >= 2)
            {
                int matchCount = currentRoundTeams / 2;
                bracket[currentRoundTeams] = new List<CupFixture>();
                for (int i = 0; i < matchCount; i++)
                {
                    bracket[currentRoundTeams].Add(new CupFixture {
                        Id = Guid.NewGuid(),
                        Season = season.Value,
                        Round = currentRoundTeams,
                        MatchNo = i + 1,
                    });
                }
                currentRoundTeams /= 2;
            }

            // Link matches (NextMatchId)
            currentRoundTeams = totalSlots;
            while (currentRoundTeams > 2)
            {
                var currentRoundMatches = bracket[currentRoundTeams];
                var nextRoundMatches = bracket[currentRoundTeams / 2];

                for (int i = 0; i < currentRoundMatches.Count; i++)
                {
                    int nextMatchIndex = i / 2;
                    currentRoundMatches[i].NextMatchId = nextRoundMatches[nextMatchIndex].Id;
                }
                currentRoundTeams /= 2;
            }

            // Assign players to Round 1
            var round1Matches = bracket[totalSlots];
            
            // To spread byes evenly, we can randomly pick matches to be byes
            var matchIndices = Enumerable.Range(0, round1MatchesCount).OrderBy(x => rng.Next()).ToList();
            var byeIndices = new HashSet<int>(matchIndices.Take(byesCount));

            int playerIdx = 0;
            for (int i = 0; i < round1MatchesCount; i++)
            {
                var match = round1Matches[i];
                if (byeIndices.Contains(i))
                {
                    // It's a bye match (only 1 player)
                    match.HomeUserId = players[playerIdx++];
                    match.AwayUserId = null;
                    match.IsBye = true;
                    match.IsPlayed = true;
                }
                else
                {
                    // Regular match (2 players)
                    match.HomeUserId = players[playerIdx++];
                    match.AwayUserId = players[playerIdx++];
                    match.IsBye = false;
                }
            }

            // Save all matches
            foreach (var r in bracket.Keys)
            {
                _context.CupFixtures.AddRange(bracket[r]);
            }
            await _context.SaveChangesAsync();

            // Propagate byes to the next round immediately
            await PropagateByes(season.Value);

            return Ok(new { message = "สร้างสายการแข่งขันบอลถ้วยสำเร็จ!" });
        }

        private async Task PropagateByes(int season)
        {
            bool changesMade = true;
            while (changesMade)
            {
                changesMade = false;
                var matches = await _context.CupFixtures.Where(f => f.Season == season).ToListAsync();
                
                foreach (var match in matches)
                {
                    if (match.IsBye && match.IsPlayed && match.NextMatchId.HasValue)
                    {
                        var winnerId = match.HomeUserId ?? match.AwayUserId;
                        var nextMatch = matches.FirstOrDefault(m => m.Id == match.NextMatchId.Value);
                        if (nextMatch != null)
                        {
                            // Check if the winner is already propagated to the next match
                            if (nextMatch.HomeUserId != winnerId && nextMatch.AwayUserId != winnerId)
                            {
                                if (string.IsNullOrEmpty(nextMatch.HomeUserId))
                                {
                                    nextMatch.HomeUserId = winnerId;
                                    changesMade = true;
                                }
                                else if (string.IsNullOrEmpty(nextMatch.AwayUserId))
                                {
                                    nextMatch.AwayUserId = winnerId;
                                    changesMade = true;
                                }

                                if (changesMade)
                                {
                                    _context.CupFixtures.Update(nextMatch);
                                }
                            }
                        }
                    }
                }
                if (changesMade) await _context.SaveChangesAsync();
            }
        }

        [HttpPost("reset")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> ResetBracket()
        {
            var season = await _scaffoldedContext.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue) return BadRequest(new { message = "ไม่พบ Season ปัจจุบัน" });

            var existing = await _context.CupFixtures.Where(f => f.Season == season.Value).ToListAsync();
            _context.CupFixtures.RemoveRange(existing);
            await _context.SaveChangesAsync();

            return Ok(new { message = "ลบข้อมูลบอลถ้วยสำเร็จ" });
        }

        [HttpPost("{id}/report")]
        [Authorize]
        public async Task<IActionResult> ReportResult(Guid id, [FromBody] CupReportDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userLevel = User.FindFirstValue(ClaimTypes.Role);

            var match = await _context.CupFixtures.FirstOrDefaultAsync(f => f.Id == id);
            if (match == null) return NotFound(new { message = "ไม่พบแมตช์นี้" });

            if (match.IsPlayed && userLevel != "admin" && userLevel != "moderator")
                return BadRequest(new { message = "แมตช์นี้แข่งจบไปแล้ว ไม่สามารถแก้ไขได้" });

            if (userLevel != "admin" && userLevel != "moderator")
            {
                if (match.HomeUserId != userId && match.AwayUserId != userId)
                    return Forbid();
            }

            if (dto.HomeScore == dto.AwayScore)
                return BadRequest(new { message = "บอลถ้วยต้องมีผู้ชนะ (ห้ามเสมอ)" });

            match.HomeScore = dto.HomeScore;
            match.AwayScore = dto.AwayScore;
            match.IsPlayed = true;

            _context.CupFixtures.Update(match);
            await _context.SaveChangesAsync();

            // Auto advance
            if (match.NextMatchId.HasValue)
            {
                var winnerId = dto.HomeScore > dto.AwayScore ? match.HomeUserId : match.AwayUserId;
                var nextMatch = await _context.CupFixtures.FirstOrDefaultAsync(f => f.Id == match.NextMatchId.Value);
                if (nextMatch != null)
                {
                    // Find if winner is already in the next match
                    if (nextMatch.HomeUserId != winnerId && nextMatch.AwayUserId != winnerId)
                    {
                        // Determine which slot is empty. We can use logic based on original match position.
                        // Or simply fill the first available slot.
                        // Wait, a match receives exactly 2 winners. We should place it based on which branch it came from.
                        // Actually, if we just place in Home if empty, then Away if empty, it's fine.
                        // But if admin edits the result and changes the winner, we need to replace the old winner.
                        var oldWinnerId = dto.HomeScore < dto.AwayScore ? match.HomeUserId : match.AwayUserId;
                        
                        if (nextMatch.HomeUserId == oldWinnerId)
                            nextMatch.HomeUserId = winnerId;
                        else if (nextMatch.AwayUserId == oldWinnerId)
                            nextMatch.AwayUserId = winnerId;
                        else if (string.IsNullOrEmpty(nextMatch.HomeUserId))
                            nextMatch.HomeUserId = winnerId;
                        else
                            nextMatch.AwayUserId = winnerId;

                        _context.CupFixtures.Update(nextMatch);
                        await _context.SaveChangesAsync();
                    }
                }
            }

            return Ok(new { message = "บันทึกผลการแข่งขันสำเร็จ!" });
        }
    }

    public class CupReportDto
    {
        public int HomeScore { get; set; }
        public int AwayScore { get; set; }
    }
}
