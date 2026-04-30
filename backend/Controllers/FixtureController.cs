using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [Route("api/fixtures")]
    [ApiController]
    public class FixtureController : ControllerBase
    {
        private readonly ScaffoldedDbContext _db;
        private readonly IAuctionService _auctionService;

        public FixtureController(ScaffoldedDbContext db, IAuctionService auctionService)
        {
            _db = db;
            _auctionService = auctionService;
        }

        public class ResetRequest
        {
            public bool ResetFixtures { get; set; }
            public bool ResetTeams { get; set; }
        }

        // GET api/fixtures?search=teamA
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll([FromQuery] string? search)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userLevel = User.FindFirstValue(ClaimTypes.Role);

            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == "D1" && f.Active == "YES");

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            if (userLevel != "admin" && !string.IsNullOrEmpty(userId))
                query = query.Where(f => f.Home == userId || f.Away == userId);

            if (!string.IsNullOrEmpty(search))
                query = query.Where(f =>
                    (f.Home != null && f.Home.Contains(search)) ||
                    (f.Away != null && f.Away.Contains(search)) ||
                    (f.HomeTeamName != null && f.HomeTeamName.Contains(search)) ||
                    (f.AwayTeamName != null && f.AwayTeamName.Contains(search)));

            var data = await query
                .OrderBy(f => f.Match)
                .ToListAsync();

            // Join with TbmFixtureAlls to include yellow/red card data
            var cardQuery = _db.TbmFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == "D1" && f.Active == "YES");

            if (currentSeason.HasValue)
                cardQuery = cardQuery.Where(f => f.Season == currentSeason.Value);

            if (userLevel != "admin" && !string.IsNullOrEmpty(userId))
                cardQuery = cardQuery.Where(f => f.Home == userId || f.Away == userId);

            var cardData = await cardQuery
                .Select(f => new { f.FixtureId, f.HomeYellow, f.HomeRed, f.AwayYellow, f.AwayRed })
                .ToDictionaryAsync(f => f.FixtureId);

            var result = data
                .Where(f => !string.IsNullOrEmpty(f.FixtureId))
                .Select(f =>
                {
                    cardData.TryGetValue(f.FixtureId, out var card);
                    return new
                    {
                        f.FixtureId,
                        f.Division,
                        f.Match,
                        f.Home,
                        f.HomeScore,
                        f.AwayScore,
                        f.Away,
                        f.Active,
                        f.HomeImage,
                        f.AwayImage,
                        f.Season,
                        f.HomeTeamName,
                        f.AwayTeamName,
                        f.Platform,
                        HomeYellow = card?.HomeYellow,
                        HomeRed = card?.HomeRed,
                        AwayYellow = card?.AwayYellow,
                        AwayRed = card?.AwayRed,
                    };
                }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET api/fixtures/public  — no login required, returns all fixtures grouped by match
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic()
        {
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == "D1" && f.Active == "YES");

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            var data = await query.OrderBy(f => f.Match).ToListAsync();

            var cardQuery = _db.TbmFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == "D1" && f.Active == "YES");

            if (currentSeason.HasValue)
                cardQuery = cardQuery.Where(f => f.Season == currentSeason.Value);

            var cardData = await cardQuery
                .Select(f => new { f.FixtureId, f.HomeYellow, f.HomeRed, f.AwayYellow, f.AwayRed })
                .ToDictionaryAsync(f => f.FixtureId ?? "");

            var result = data
                .Where(f => !string.IsNullOrEmpty(f.FixtureId))
                .Select(f =>
                {
                    cardData.TryGetValue(f.FixtureId, out var card);
                    return new
                    {
                        f.FixtureId,
                        f.Match,
                        f.Home,
                        f.HomeScore,
                        f.AwayScore,
                        f.Away,
                        f.Active,
                        f.HomeImage,
                        f.AwayImage,
                        f.HomeTeamName,
                        f.AwayTeamName,
                        HomeYellow = card?.HomeYellow,
                        HomeRed = card?.HomeRed,
                        AwayYellow = card?.AwayYellow,
                        AwayRed = card?.AwayRed,
                    };
                }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET api/fixtures/last10 — no login required, latest 10 by match date (from v_fixture_all_log)
        [HttpGet("last10")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLast10()
        {
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAllLogs
                .Where(f =>
                    f.Platform == "PC" &&
                    f.Division == "D1" &&
                    f.MatchDate != null);

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            var data = await query
                .OrderByDescending(f => f.MatchDate)
                .Take(10)
                .Select(f => new
                {
                    f.FixtureId,
                    f.Match,
                    f.Home,
                    f.HomeTeamName,
                    f.HomeImage,
                    f.HomeScore,
                    f.AwayScore,
                    f.Away,
                    f.AwayTeamName,
                    f.AwayImage,
                    f.MatchDate,
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(data));
        }

        // GET api/fixtures/{fixtureId}/detail
        [HttpGet("{fixtureId}/detail")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDetail(string fixtureId)
        {
            var fixture = await _db.TbmFixtureAlls
                .FirstOrDefaultAsync(f => f.FixtureId == fixtureId);

            if (fixture == null)
                return NotFound(ApiResponse<object>.Fail("ไม่พบ Fixture นี้"));

            return Ok(ApiResponse<object>.Ok(new
            {
                homeYellow = fixture.HomeYellow ?? 0,
                homeRed = fixture.HomeRed ?? 0,
                awayYellow = fixture.AwayYellow ?? 0,
                awayRed = fixture.AwayRed ?? 0,
            }));
        }

        // GET api/fixtures/h2h?home=X&away=Y — no login required, returns all-time H2H history between two players
        [HttpGet("h2h")]
        [AllowAnonymous]
        public async Task<IActionResult> GetH2H([FromQuery] string home, [FromQuery] string away)
        {
            if (string.IsNullOrWhiteSpace(home) || string.IsNullOrWhiteSpace(away))
                return BadRequest(ApiResponse<object>.Fail("Both home and away parameters are required and cannot be empty"));

            var data = await _db.VFixtureAllLogs
                .Where(f =>
                    f.Platform == "PC" &&
                    f.Division == "D1" &&
                    f.HomeScore != null &&
                    f.AwayScore != null &&
                    ((f.Home == home && f.Away == away) ||
                     (f.Home == away && f.Away == home)))
                .OrderByDescending(f => f.MatchDate)
                .ToListAsync();

            var cardData = await _db.TbmFixtureAlls
                .Where(f =>
                    f.Platform == "PC" &&
                    f.Division == "D1" &&
                    ((f.Home == home && f.Away == away) ||
                     (f.Home == away && f.Away == home)))
                .Select(f => new { f.FixtureId, f.HomeYellow, f.HomeRed, f.AwayYellow, f.AwayRed })
                .ToDictionaryAsync(f => f.FixtureId);

            var result = data.Select(f =>
            {
                cardData.TryGetValue(f.FixtureId, out var cardStats);
                return new
                {
                    f.FixtureId,
                    f.Season,
                    f.Match,
                    f.Home,
                    f.HomeTeamName,
                    f.HomeScore,
                    f.AwayScore,
                    f.Away,
                    f.AwayTeamName,
                    f.HomeImage,
                    f.AwayImage,
                    f.MatchDate,
                    f.MatchDateDisplay,
                    HomeYellow = cardStats?.HomeYellow,
                    HomeRed = cardStats?.HomeRed,
                    AwayYellow = cardStats?.AwayYellow,
                    AwayRed = cardStats?.AwayRed,
                };
            }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }

        // POST api/fixtures/{fixtureId}/report
        [HttpPost("{fixtureId}/report")]
        [Authorize]
        public async Task<IActionResult> ReportResult(string fixtureId, [FromBody] ReportResultDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userLevel = User.FindFirstValue(ClaimTypes.Role);

            // 1. ดึงข้อมูล fixture จาก tbm_fixture_all
            var fixture = await _db.TbmFixtureAlls
                .FirstOrDefaultAsync(f => f.FixtureId == fixtureId);

            if (fixture == null)
                return NotFound(ApiResponse<object>.Fail("ไม่พบ Fixture นี้"));

            // User-level can report only own fixtures. Admin can report any fixture.
            if (!string.Equals(userLevel, "admin", StringComparison.OrdinalIgnoreCase))
            {
                var canReportOwnMatch = !string.IsNullOrWhiteSpace(userId) &&
                    (string.Equals(fixture.Home, userId, StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(fixture.Away, userId, StringComparison.OrdinalIgnoreCase));

                if (!canReportOwnMatch)
                    return Forbid();
            }

            // 2. เช็คว่าบันทึกผลไปแล้วหรือยัง (HomeScore/AwayScore ไม่เป็น null = บันทึกแล้ว)
            if (fixture.HomeScore != null && fixture.AwayScore != null)
                return BadRequest(ApiResponse<object>.Fail("บันทึกผลไปแล้ว ไม่สามารถบันทึกซ้ำได้"));

            // 3. เช็ค tbt_result ว่ามี fixture_id นี้แล้วไหม
            var existsResult = await _db.TbtResults
                .AnyAsync(r => r.FixtureId == fixtureId);

            if (existsResult)
                return BadRequest(ApiResponse<object>.Fail("บันทึกผลไปแล้ว ไม่สามารถบันทึกซ้ำได้"));

            // คำนวณ W/D/L
            int homeW = 0, homeD = 0, homeL = 0;
            int awayW = 0, awayD = 0, awayL = 0;
            int homePts = 0, awayPts = 0;

            if (dto.HomeScore > dto.AwayScore)
            {
                homeW = 1; homePts = 3;
                awayL = 1; awayPts = 0;
            }
            else if (dto.HomeScore == dto.AwayScore)
            {
                homeD = 1; homePts = 1;
                awayD = 1; awayPts = 1;
            }
            else
            {
                homeL = 1; homePts = 0;
                awayW = 1; awayPts = 3;
            }

            // 4. Update tbm_fixture_all
            fixture.HomeScore = dto.HomeScore;
            fixture.AwayScore = dto.AwayScore;
            fixture.Active = "YES";
            fixture.MatchDate = DateTime.Now;
            fixture.HomeYellow = dto.HomeYellow;
            fixture.HomeRed = dto.HomeRed;
            fixture.AwayYellow = dto.AwayYellow;
            fixture.AwayRed = dto.AwayRed;
            _db.TbmFixtureAlls.Update(fixture);

            // 5. Upsert tbl_fixture_log
            var existingLog = await _db.TblFixtureLogs
                .FirstOrDefaultAsync(l => l.FixtureId == fixtureId);

            // fallback: ถ้าหาด้วย fixture_id ไม่เจอ ให้หาด้วย Home, Away, Season, Platform
            if (existingLog == null)
            {
                existingLog = await _db.TblFixtureLogs
                    .FirstOrDefaultAsync(l =>
                        l.Home == fixture.Home &&
                        l.Away == fixture.Away &&
                        l.Season == fixture.Season &&
                        l.Platform == fixture.Platform);

                if (existingLog != null)
                {
                    // ไม่แก้ FixtureId เพราะเป็น PK — update ข้อมูลตามเดิม
                }
            }

            if (existingLog != null)
            {
                existingLog.HomeScore = dto.HomeScore;
                existingLog.AwayScore = dto.AwayScore;
                existingLog.Active = "YES";
                existingLog.MatchDate = DateTime.Now;
                existingLog.HomeYellow = dto.HomeYellow;
                existingLog.HomeRed = dto.HomeRed;
                existingLog.AwayYellow = dto.AwayYellow;
                existingLog.AwayRed = dto.AwayRed;
            }
            else
            {
                await _db.TblFixtureLogs.AddAsync(new TblFixtureLog
                {
                    FixtureId = fixtureId,
                    Division = fixture.Division,
                    Match = fixture.Match,
                    Home = fixture.Home,
                    Away = fixture.Away,
                    HomeScore = dto.HomeScore,
                    AwayScore = dto.AwayScore,
                    Active = "YES",
                    Season = fixture.Season,
                    MatchDate = DateTime.Now,
                    Platform = fixture.Platform,
                    HomeYellow = dto.HomeYellow,
                    HomeRed = dto.HomeRed,
                    AwayYellow = dto.AwayYellow,
                    AwayRed = dto.AwayRed,
                });
            }

            // 6. Insert tbt_result สำหรับ Home
            await _db.TbtResults.AddAsync(new TbtResult
            {
                Id = Guid.NewGuid().ToString(),
                FixtureId = fixtureId,
                Division = fixture.Division,
                Team = fixture.Home,
                Pl = 1,
                W = homeW,
                D = homeD,
                L = homeL,
                Gf = dto.HomeScore,
                Ga = dto.AwayScore,
                Gd = dto.HomeScore - dto.AwayScore,
                Pts = homePts,
                Season = fixture.Season,
                Platform = fixture.Platform,
                CreateDate = DateTime.Now,
                Yellow = dto.HomeYellow,
                Red = dto.HomeRed,
            });

            // 7. Insert tbt_result สำหรับ Away
            await _db.TbtResults.AddAsync(new TbtResult
            {
                Id = Guid.NewGuid().ToString(),
                FixtureId = fixtureId,
                Division = fixture.Division,
                Team = fixture.Away,
                Pl = 1,
                W = awayW,
                D = awayD,
                L = awayL,
                Gf = dto.AwayScore,
                Ga = dto.HomeScore,
                Gd = dto.AwayScore - dto.HomeScore,
                Pts = awayPts,
                Season = fixture.Season,
                Platform = fixture.Platform,
                CreateDate = DateTime.Now,
                Yellow = dto.AwayYellow,
                Red = dto.AwayRed,
            });

            await _db.SaveChangesAsync();

            // SEND DISCORD NOTIFICATION
            try
            {
                var vFixture = await _db.VFixtureAlls.FirstOrDefaultAsync(v => v.FixtureId == fixtureId);
                var reportUser = await _db.TbmUsers.FirstOrDefaultAsync(u => u.UserId == userId);
                var reportUserName = reportUser?.LineName ?? userId;

                string? homeName = vFixture?.HomeTeamName ?? fixture.Home;
                string? awayName = vFixture?.AwayTeamName ?? fixture.Away;

                string resultMsg = "แจ้งผลการแข่งขัน " + fixture.Division + " : " + homeName + " " + dto.HomeScore.ToString() + " - " + dto.AwayScore.ToString() + " " + awayName + " \n\nREPORT BY " + reportUserName;
                _ = SendDiscordEmbed(resultMsg);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
            }

            return Ok(ApiResponse<object>.Ok(new { message = "บันทึกผลสำเร็จ" }));
        }

        // PUT api/fixtures/{fixtureId}/report  (admin only — แก้ไขผลที่บันทึกแล้ว)
        [HttpPut("{fixtureId}/report")]
        [HttpPost("{fixtureId}/report/edit")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> EditResult(string fixtureId, [FromBody] ReportResultDto dto)
        {
            var fixture = await _db.TbmFixtureAlls
                .FirstOrDefaultAsync(f => f.FixtureId == fixtureId);

            if (fixture == null)
                return NotFound(ApiResponse<object>.Fail("ไม่พบ Fixture นี้"));

            if (fixture.HomeScore == null || fixture.AwayScore == null)
                return BadRequest(ApiResponse<object>.Fail("ยังไม่มีการบันทึกผล ใช้ POST แทน"));

            // คำนวณ W/D/L
            int homeW = 0, homeD = 0, homeL = 0;
            int awayW = 0, awayD = 0, awayL = 0;
            int homePts = 0, awayPts = 0;

            if (dto.HomeScore > dto.AwayScore)
            {
                homeW = 1; homePts = 3; awayL = 1; awayPts = 0;
            }
            else if (dto.HomeScore == dto.AwayScore)
            {
                homeD = 1; homePts = 1; awayD = 1; awayPts = 1;
            }
            else
            {
                homeL = 1; homePts = 0; awayW = 1; awayPts = 3;
            }

            // Update tbm_fixture_all
            fixture.HomeScore = dto.HomeScore;
            fixture.AwayScore = dto.AwayScore;
            fixture.MatchDate = DateTime.Now;
            fixture.HomeYellow = dto.HomeYellow;
            fixture.HomeRed = dto.HomeRed;
            fixture.AwayYellow = dto.AwayYellow;
            fixture.AwayRed = dto.AwayRed;
            _db.TbmFixtureAlls.Update(fixture);

            // Upsert tbl_fixture_log
            var log = await _db.TblFixtureLogs.FirstOrDefaultAsync(l => l.FixtureId == fixtureId);

            // fallback: ถ้าหาด้วย fixture_id ไม่เจอ ให้หาด้วย Home, Away, Season, Platform
            if (log == null)
            {
                log = await _db.TblFixtureLogs
                    .FirstOrDefaultAsync(l =>
                        l.Home == fixture.Home &&
                        l.Away == fixture.Away &&
                        l.Season == fixture.Season &&
                        l.Platform == fixture.Platform);

                if (log != null)
                {
                    // ไม่แก้ FixtureId เพราะเป็น PK — update ข้อมูลตามเดิม
                }
            }

            if (log != null)
            {
                log.HomeScore = dto.HomeScore;
                log.AwayScore = dto.AwayScore;
                log.MatchDate = DateTime.Now;
                log.HomeYellow = dto.HomeYellow;
                log.HomeRed = dto.HomeRed;
                log.AwayYellow = dto.AwayYellow;
                log.AwayRed = dto.AwayRed;
            }
            else
            {
                await _db.TblFixtureLogs.AddAsync(new TblFixtureLog
                {
                    FixtureId = fixtureId,
                    Division = fixture.Division,
                    Match = fixture.Match,
                    Home = fixture.Home,
                    Away = fixture.Away,
                    HomeScore = dto.HomeScore,
                    AwayScore = dto.AwayScore,
                    Active = "YES",
                    Season = fixture.Season,
                    MatchDate = DateTime.Now,
                    Platform = fixture.Platform,
                    HomeYellow = dto.HomeYellow,
                    HomeRed = dto.HomeRed,
                    AwayYellow = dto.AwayYellow,
                    AwayRed = dto.AwayRed,
                });
            }

            // Delete old tbt_result rows for this fixture then re-insert
            var oldResults = _db.TbtResults.Where(r => r.FixtureId == fixtureId);
            _db.TbtResults.RemoveRange(oldResults);

            await _db.TbtResults.AddAsync(new TbtResult
            {
                Id = Guid.NewGuid().ToString(),
                FixtureId = fixtureId,
                Division = fixture.Division,
                Team = fixture.Home,
                Pl = 1,
                W = homeW,
                D = homeD,
                L = homeL,
                Gf = dto.HomeScore,
                Ga = dto.AwayScore,
                Gd = dto.HomeScore - dto.AwayScore,
                Pts = homePts,
                Season = fixture.Season,
                Platform = fixture.Platform,
                CreateDate = DateTime.Now,
                Yellow = dto.HomeYellow,
                Red = dto.HomeRed,
            });

            await _db.TbtResults.AddAsync(new TbtResult
            {
                Id = Guid.NewGuid().ToString(),
                FixtureId = fixtureId,
                Division = fixture.Division,
                Team = fixture.Away,
                Pl = 1,
                W = awayW,
                D = awayD,
                L = awayL,
                Gf = dto.AwayScore,
                Ga = dto.HomeScore,
                Gd = dto.AwayScore - dto.HomeScore,
                Pts = awayPts,
                Season = fixture.Season,
                Platform = fixture.Platform,
                CreateDate = DateTime.Now,
                Yellow = dto.AwayYellow,
                Red = dto.AwayRed,
            });

            await _db.SaveChangesAsync();

            // SEND DISCORD NOTIFICATION
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Unknown";
                var vFixture = await _db.VFixtureAlls.FirstOrDefaultAsync(v => v.FixtureId == fixtureId);
                var reportUser = await _db.TbmUsers.FirstOrDefaultAsync(u => u.UserId == userId);
                var reportUserName = reportUser?.LineName ?? userId ?? "Admin";

                string homeName = vFixture?.HomeTeamName ?? fixture.Home ?? "Home";
                string awayName = vFixture?.AwayTeamName ?? fixture.Away ?? "Away";

                string resultMsg = "แก้ไขผลการแข่งขัน " + fixture.Division + " : " + homeName + " " + dto.HomeScore.ToString() + " - " + dto.AwayScore.ToString() + " " + awayName + " \n\nEDIT BY " + reportUserName;
                _ = SendDiscordEmbed(resultMsg);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
            }

            return Ok(ApiResponse<object>.Ok(new { message = "แก้ไขผลสำเร็จ" }));
        }

        private async Task SendDiscordEmbed(string message)
        {
            try
            {
                string webhookUrl = "https://discord.com/api/webhooks/1376384353894142002/ProgNBZkOnWteq66wJKuSKmz---IjXYxGMTbah7JjxirdYaZdlLuvwUG8XJcttR5JKat";

                var payload = new
                {
                    embeds = new[]
                    {
                        new
                        {
                            title = "MATCH RESULT",
                            description = message,
                            color = 0x2ECC71,
                            footer = new { text = "TPL FA" },
                            timestamp = DateTime.UtcNow.ToString("o")
                        }
                    }
                };

                var options = new System.Text.Json.JsonSerializerOptions
                {
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                var json = System.Text.Json.JsonSerializer.Serialize(payload, options);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                using (var client = new HttpClient())
                {
                    var response = await client.PostAsync(webhookUrl, content);
                    if (!response.IsSuccessStatusCode)
                        System.Diagnostics.Debug.WriteLine("ส่งไม่สำเร็จ: " + response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("ข้อผิดพลาด: " + ex.Message);
            }
        }

        // ─────────────────────────────────────────────
        // GET api/fixtures/generate-preview  (Admin only)
        // ─────────────────────────────────────────────
        [HttpGet("generate-preview")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetGeneratePreview()
        {
            var season = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue)
                return BadRequest(ApiResponse<object>.Fail("ไม่พบ Season ปัจจุบัน"));

            var players = await _db.TbmUsers
                .Where(u => u.UserLevel != "admin")
                .ToListAsync();

            int n = players.Count;
            bool isEven = n % 2 == 0;
            int rounds = isEven ? n - 1 : n;
            int perRound = isEven ? n / 2 : (n - 1) / 2;
            int leg1Matches = rounds * perRound;

            var existingCount = await _db.TbmFixtureAlls
                .CountAsync(f => f.Season == season && f.Platform == "PC" && f.Division == "D1");

            // Check Quotas
            var quotaCheck = await _auctionService.ValidateAllQuotasAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                season = season.Value,
                playerCount = n,
                leg1MatchCount = leg1Matches,
                totalMatchCount = leg1Matches * 2,
                existingFixtureCount = existingCount,
                quotaError = !quotaCheck.Success ? quotaCheck : null,
                players = players.Select(p => new
                {
                    userId = p.UserId,
                    lineName = p.LineName ?? p.UserId,
                    currentTeam = p.CurrentTeam ?? p.LineName ?? p.UserId
                })
            }));
        }

        // ─────────────────────────────────────────────
        // POST api/fixtures/generate  (Admin only)
        // ─────────────────────────────────────────────
        [HttpPost("generate")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GenerateFixture()
        {
            var season = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue)
                return BadRequest(ApiResponse<object>.Fail("ไม่พบ Season ปัจจุบัน"));

            // Block if fixtures already exist in test table
            var existingCount = await _db.TbmFixtureAlls
                .CountAsync(f => f.Season == season && f.Platform == "PC" && f.Division == "D1");

            if (existingCount > 0)
                return BadRequest(ApiResponse<object>.Fail($"Season {season.Value} มี Fixture อยู่แล้ว {existingCount} รายการ ไม่สามารถ Generate ซ้ำได้"));

            // Check Quotas before generating
            var quotaCheck = await _auctionService.ValidateAllQuotasAsync();
            if (!quotaCheck.Success)
            {
                return BadRequest(ApiResponse<object>.Fail(quotaCheck.Message, quotaCheck.FailedUsers));
            }

            // ดึงผู้เล่นทั้งหมดที่ไม่ใช่ admin พร้อมข้อมูลทีม
            var users = await _db.TbmUsers
                .Where(u => u.UserLevel != "admin")
                .ToListAsync();

            if (users.Count < 2)
                return BadRequest(ApiResponse<object>.Fail("ต้องมีผู้เล่นอย่างน้อย 2 คน"));

            var userIds = users.Select(u => u.UserId).ToList();
            var fixtures = GenerateRoundRobin(userIds);
            
            var fixtureInsert = new List<TbmFixtureAll>();
            var teamInsert = new List<TbmTeam>();

            // 1. เตรียมข้อมูล Fixtures (ใช้ UserId สำหรับ Home/Away)
            // Leg 1 — ACTIVE='YES'
            foreach (var (home, away, matchday) in fixtures)
            {
                fixtureInsert.Add(new TbmFixtureAll
                {
                    FixtureId = Guid.NewGuid().ToString(),
                    Division = "D1",
                    Match = matchday,
                    Home = home, // UserId
                    Away = away, // UserId
                    Active = "YES",
                    Season = season.Value,
                    Platform = "PC",
                    Leg = 1
                });
            }

            // Leg 2 — ACTIVE='NO', Home/Away สลับ
            foreach (var (home, away, matchday) in fixtures)
            {
                fixtureInsert.Add(new TbmFixtureAll
                {
                    FixtureId = Guid.NewGuid().ToString(),
                    Division = "D1",
                    Match = matchday,
                    Home = away, // UserId สลับ
                    Away = home, // UserId สลับ
                    Active = "NO",
                    Season = season.Value,
                    Platform = "PC",
                    Leg = 2
                });
            }

            // 2. เตรียมข้อมูล Team Entry (ตาราง tbm_team)
            foreach (var u in users)
            {
                // ตรวจสอบก่อนว่ามี team entry อยู่แล้วหรือไม่ (กันเหนียว)
                var exists = await _db.TbmTeams.AnyAsync(t => 
                    t.Player == u.UserId && 
                    t.Season == season.Value && 
                    t.Platform == "PC");

                if (!exists)
                {
                    teamInsert.Add(new TbmTeam
                    {
                        Player = u.UserId,
                        Division = "D1",
                        Season = season.Value,
                        Platform = "PC",
                        TeamName = !string.IsNullOrEmpty(u.CurrentTeam) ? u.CurrentTeam : (u.LineName ?? u.UserId)
                    });
                }
            }

            // บันทึกข้อมูลทั้งหมด
            using (var transaction = await _db.Database.BeginTransactionAsync())
            {
                try
                {
                    await _db.TbmFixtureAlls.AddRangeAsync(fixtureInsert);
                    await _db.TbmTeams.AddRangeAsync(teamInsert);
                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(ApiResponse<object>.Fail("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + ex.Message));
                }
            }

            return Ok(ApiResponse<object>.Ok(new
            {
                message = $"Generate สำเร็จ! สร้าง {fixtureInsert.Count} fixtures และ {teamInsert.Count} team entries (Season {season.Value})",
                matchCount = fixtureInsert.Count,
                teamCount = teamInsert.Count,
                season = season.Value
            }));
        }

        // ─────────────────────────────────────────────
        // POST api/fixtures/reset  (Admin only)
        // ─────────────────────────────────────────────
        [HttpPost("reset")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> ResetFixture([FromBody] ResetRequest? request)
        {
            if (request == null) return BadRequest(ApiResponse<object>.Fail("Invalid Request Payload"));

            var season = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue)
                return BadRequest(ApiResponse<object>.Fail("ไม่พบข้อมูล Season ปัจจุบันในระบบ"));

            var strategy = _db.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using (var transaction = await _db.Database.BeginTransactionAsync())
                {
                    try
                    {
                        int fixtureCount = 0;
                        int teamCount = 0;

                        if (request.ResetFixtures)
                        {
                            var fixturesToDelete = await _db.TbmFixtureAlls
                                .Where(f => f.Season == season.Value && f.Platform == "PC")
                                .ToListAsync();
                            
                            fixtureCount = fixturesToDelete.Count;
                            if (fixtureCount > 0)
                            {
                                _db.TbmFixtureAlls.RemoveRange(fixturesToDelete);
                                await _db.SaveChangesAsync();
                            }
                        }

                        if (request.ResetTeams)
                        {
                            var teamsToDelete = await _db.TbmTeams
                                .Where(t => t.Season == season.Value && t.Platform == "PC")
                                .ToListAsync();
                            
                            teamCount = teamsToDelete.Count;
                            if (teamCount > 0)
                            {
                                _db.TbmTeams.RemoveRange(teamsToDelete);
                                await _db.SaveChangesAsync();
                            }
                        }

                        await transaction.CommitAsync();

                        return (IActionResult)Ok(ApiResponse<object>.Ok(new { 
                            message = $"ล้างข้อมูลสำเร็จ (ลบ {fixtureCount} fixtures, {teamCount} teams)",
                            fixtureCount,
                            teamCount
                        }));
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        var errorMsg = ex.InnerException?.Message ?? ex.Message;
                        return (IActionResult)BadRequest(ApiResponse<object>.Fail($"Reset ไม่สำเร็จ: {errorMsg}"));
                    }
                }
            });
        }

        // ─────────────────────────────────────────────
        // Round Robin (Berger Table rotation algorithm)
        // Returns: list of (home, away, matchday)
        // ─────────────────────────────────────────────
        private static List<(string Home, string Away, int Matchday)> GenerateRoundRobin(List<string> players)
        {
            var arr = new List<string>(players);
            if (arr.Count % 2 != 0) arr.Add("BYE");

            int total = arr.Count;
            int rounds = total - 1;
            int perRound = total / 2;
            var result = new List<(string, string, int)>();

            for (int r = 0; r < rounds; r++)
            {
                for (int i = 0; i < perRound; i++)
                {
                    string a = arr[i];
                    string b = arr[total - 1 - i];
                    if (a != "BYE" && b != "BYE")
                    {
                        // สลับ Home/Away ให้สมดุล
                        if ((r + i) % 2 == 0)
                            result.Add((a, b, r + 1));
                        else
                            result.Add((b, a, r + 1));
                    }
                }
                // Rotate: fix arr[0], rotate arr[1..total-1]
                string last = arr[total - 1];
                for (int i = total - 1; i > 1; i--)
                    arr[i] = arr[i - 1];
                arr[1] = last;
            }
            return result;
        }
    }
}

