using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Services.Interfaces;
using eTPL.API.Models.Auction;

namespace eTPL.API.Controllers
{
    [Route("api/fixtures")]
    [ApiController]
    public class FixtureController : ControllerBase
    {
        private readonly MsSqlDbContext _db;
        private readonly IAuctionService _auctionService;
        private readonly IDiscordService _discordService;

        public FixtureController(MsSqlDbContext db, IAuctionService auctionService, IDiscordService discordService)
        {
            _db = db;
            _auctionService = auctionService;
            _discordService = discordService;
        }

        public class ResetRequest
        {
            public bool ResetFixtures { get; set; }
            public bool ResetTeams { get; set; }
            public string Division { get; set; } = "D1";
        }

        // GET api/fixtures?search=teamA
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? division = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userLevel = User.FindFirstValue(ClaimTypes.Role);

            string? targetDivision = division;
            if (string.IsNullOrEmpty(targetDivision))
            {
                if (!string.IsNullOrEmpty(search))
                {
                    var searchUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == search);
                    targetDivision = searchUser?.CurrentDivision ?? "D1";
                }
                else if (!string.IsNullOrEmpty(userId))
                {
                    var loggedInUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                    targetDivision = loggedInUser?.CurrentDivision ?? "D1";
                }
                else
                {
                    targetDivision = "D1";
                }
            }

            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == targetDivision && f.Active == "YES");

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            if (userLevel != "admin" && userLevel != "moderator" && !string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(search))
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
                .Where(f => f.Platform == "PC" && f.Division == targetDivision && f.Active == "YES");

            if (currentSeason.HasValue)
                cardQuery = cardQuery.Where(f => f.Season == currentSeason.Value);

            if (userLevel != "admin" && userLevel != "moderator" && !string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(search))
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
        public async Task<IActionResult> GetPublic([FromQuery] string division = "D1")
        {
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == division && f.Active == "YES");

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            var data = await query.OrderBy(f => f.Match).ToListAsync();

            var cardQuery = _db.TbmFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == division && f.Active == "YES");

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
        public async Task<IActionResult> GetLast10([FromQuery] string division = "D1")
        {
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAllLogs
                .Where(f =>
                    f.Platform == "PC" &&
                    f.Division == division &&
                    f.MatchDate != null);

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            var data = await query
                .OrderByDescending(f => f.MatchDate)
                .Take(25)
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
        public async Task<IActionResult> GetH2H([FromQuery] string home, [FromQuery] string away, [FromQuery] string division = "D1")
        {
            if (string.IsNullOrWhiteSpace(home) || string.IsNullOrWhiteSpace(away))
                return BadRequest(ApiResponse<object>.Fail("Both home and away parameters are required and cannot be empty"));

            var data = await _db.VFixtureAllLogs
                .Where(f =>
                    f.Platform == "PC" &&
                    f.Division == division &&
                    f.HomeScore != null &&
                    f.AwayScore != null &&
                    ((f.Home == home && f.Away == away) ||
                     (f.Home == away && f.Away == home)))
                .OrderByDescending(f => f.MatchDate)
                .ToListAsync();

            var cardData = await _db.TbmFixtureAlls
                .Where(f =>
                    f.Platform == "PC" &&
                    f.Division == division &&
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

            // User-level can report only own fixtures. Admin/Moderator can report any fixture.
            bool isAdminOrMod = string.Equals(userLevel, "admin", StringComparison.OrdinalIgnoreCase) || 
                               string.Equals(userLevel, "moderator", StringComparison.OrdinalIgnoreCase);

            if (!isAdminOrMod)
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
                var reportUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                var reportUserName = reportUser?.LineName ?? userId;

                string homeName = vFixture?.HomeTeamName ?? fixture.Home ?? "Unknown";
                string awayName = vFixture?.AwayTeamName ?? fixture.Away ?? "Unknown";

                _ = _discordService.SendMatchResultAsync(homeName, awayName, dto.HomeScore, dto.AwayScore, fixture.Division, reportUserName);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
            }

            // Award Bonus TP if users have checked in today or yesterday (based on reporting time)
            try
            {
                var nowIct = DateTime.UtcNow.AddHours(7);
                var todayIct = nowIct.Date;

                // Determine check-in date target based on time (00:00 - 17:45 ICT looks at yesterday's check-in)
                var checkinDateTarget = todayIct;
                var currentTime = nowIct.TimeOfDay;
                var cutOffTime = new TimeSpan(17, 45, 0); // 17:45:00

                if (currentTime >= TimeSpan.Zero && currentTime <= cutOffTime)
                {
                    checkinDateTarget = todayIct.AddDays(-1);
                }

                // Home User
                var homeUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == fixture.Home);
                if (homeUser != null)
                {
                    // Prevent duplicate Match Bonus TP for this fixture
                    bool alreadyRewarded = await _db.AuctionTransactions.AnyAsync(t =>
                        t.UserId == homeUser.Id &&
                        t.Type == "BONUS" &&
                        t.Description.Contains(fixtureId));

                    if (!alreadyRewarded)
                    {
                        var hasCheckin = await _db.DailyCheckins.AnyAsync(c => c.UserId == homeUser.UserId && c.CheckinDate == checkinDateTarget);
                        if (hasCheckin)
                        {
                            await _auctionService.GiveBonusAsync(0, new GiveBonusRequest
                            {
                                TargetUserId = homeUser.Id,
                                Amount = 2,
                                Reason = $"Match Bonus (Match #{fixture.Match}) [Fixture: {fixture.FixtureId}] - Daily Check-in verified ({checkinDateTarget:yyyy-MM-dd})"
                            });
                        }
                    }
                }

                // Away User
                var awayUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == fixture.Away);
                if (awayUser != null)
                {
                    // Prevent duplicate Match Bonus TP for this fixture
                    bool alreadyRewarded = await _db.AuctionTransactions.AnyAsync(t =>
                        t.UserId == awayUser.Id &&
                        t.Type == "BONUS" &&
                        t.Description.Contains(fixtureId));

                    if (!alreadyRewarded)
                    {
                        var hasCheckin = await _db.DailyCheckins.AnyAsync(c => c.UserId == awayUser.UserId && c.CheckinDate == checkinDateTarget);
                        if (hasCheckin)
                        {
                            await _auctionService.GiveBonusAsync(0, new GiveBonusRequest
                            {
                                TargetUserId = awayUser.Id,
                                Amount = 2,
                                Reason = $"Match Bonus (Match #{fixture.Match}) [Fixture: {fixture.FixtureId}] - Daily Check-in verified ({checkinDateTarget:yyyy-MM-dd})"
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Silently fail bonus if error occurs to not break result reporting
                System.Diagnostics.Debug.WriteLine($"Bonus Error: {ex.Message}");
            }

            return Ok(ApiResponse<object>.Ok(new { message = "บันทึกผลสำเร็จ" }));
        }

        // PUT api/fixtures/{fixtureId}/report  (admin/moderator only — แก้ไขผลที่บันทึกแล้ว)
        [HttpPut("{fixtureId}/report")]
        [HttpPost("{fixtureId}/report/edit")]
        [Authorize(Roles = "admin,moderator")]
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
                var reportUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                var reportUserName = reportUser?.LineName ?? userId ?? "Admin";

                string homeName = vFixture?.HomeTeamName ?? fixture.Home ?? "Home";
                string awayName = vFixture?.AwayTeamName ?? fixture.Away ?? "Away";

                _ = _discordService.SendMatchResultAsync(homeName, awayName, dto.HomeScore, dto.AwayScore, fixture.Division, reportUserName, isEdit: true);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
            }

            return Ok(ApiResponse<object>.Ok(new { message = "แก้ไขผลสำเร็จ" }));
        }

        // POST api/fixtures/{fixtureId}/report/cancel  (admin/moderator only — ยกเลิกผลที่บันทึกแล้ว)
        [HttpPost("{fixtureId}/report/cancel")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> CancelResult(string fixtureId)
        {
            var fixture = await _db.TbmFixtureAlls
                .FirstOrDefaultAsync(f => f.FixtureId == fixtureId);

            if (fixture == null)
                return NotFound(ApiResponse<object>.Fail("ไม่พบ Fixture นี้"));

            if (fixture.HomeScore == null || fixture.AwayScore == null)
                return BadRequest(ApiResponse<object>.Fail("ยังไม่มีการบันทึกผล ไม่สามารถยกเลิกได้"));

            // 1. ลบ tbl_fixture_log
            var logs = _db.TblFixtureLogs.Where(l => l.FixtureId == fixtureId);
            _db.TblFixtureLogs.RemoveRange(logs);

            // fallback: ถ้าไม่มีใน tbl_fixture_log ด้วย FixtureId ให้ลองหาด้วย Home, Away, Season, Platform
            var fallbackLogs = await _db.TblFixtureLogs
                .Where(l =>
                    l.Home == fixture.Home &&
                    l.Away == fixture.Away &&
                    l.Season == fixture.Season &&
                    l.Platform == fixture.Platform)
                .ToListAsync();
            if (fallbackLogs.Any())
            {
                _db.TblFixtureLogs.RemoveRange(fallbackLogs);
            }

            // 2. ลบ tbt_result
            var oldResults = _db.TbtResults.Where(r => r.FixtureId == fixtureId);
            _db.TbtResults.RemoveRange(oldResults);

            // 3. Update tbm_fixture_all
            fixture.HomeScore = null;
            fixture.AwayScore = null;
            fixture.MatchDate = null;
            fixture.HomeYellow = null;
            fixture.HomeRed = null;
            fixture.AwayYellow = null;
            fixture.AwayRed = null;
            _db.TbmFixtureAlls.Update(fixture);

            // 4. Revoke Match Bonus TP
            try
            {
                var homeUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == fixture.Home);
                if (homeUser != null)
                {
                    var homeBonusTxs = await _db.AuctionTransactions
                        .Where(t => t.UserId == homeUser.Id && t.Type == "BONUS" && t.Description.Contains(fixtureId))
                        .ToListAsync();

                    foreach (var tx in homeBonusTxs)
                    {
                        var wallet = await _db.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == homeUser.Id);
                        if (wallet != null)
                        {
                            wallet.AvailableBalance -= tx.Amount;
                            _db.AuctionUserWallets.Update(wallet);
                        }
                        _db.AuctionTransactions.Remove(tx);
                    }
                }

                var awayUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == fixture.Away);
                if (awayUser != null)
                {
                    var awayBonusTxs = await _db.AuctionTransactions
                        .Where(t => t.UserId == awayUser.Id && t.Type == "BONUS" && t.Description.Contains(fixtureId))
                        .ToListAsync();

                    foreach (var tx in awayBonusTxs)
                    {
                        var wallet = await _db.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == awayUser.Id);
                        if (wallet != null)
                        {
                            wallet.AvailableBalance -= tx.Amount;
                            _db.AuctionUserWallets.Update(wallet);
                        }
                        _db.AuctionTransactions.Remove(tx);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error revoking bonus: {ex.Message}");
            }

            await _db.SaveChangesAsync();

            // SEND DISCORD NOTIFICATION
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Unknown";
                var reportUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                var reportUserName = reportUser?.LineName ?? userId ?? "Admin";

                var vFixture = await _db.VFixtureAlls.FirstOrDefaultAsync(v => v.FixtureId == fixtureId);
                string homeName = vFixture?.HomeTeamName ?? fixture.Home ?? "Home";
                string awayName = vFixture?.AwayTeamName ?? fixture.Away ?? "Away";

                _ = _discordService.SendCustomEmbedAsync(
                    "Match Result Cancelled 🚫", 
                    $"{reportUserName} has cancelled the match result between **{homeName}** and **{awayName}** (Match #{fixture.Match} in Division {fixture.Division}).", 
                    0xef4444);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
            }

            return Ok(ApiResponse<object>.Ok(new { message = "ยกเลิกผลการแข่งขันสำเร็จ" }));
        }


        // ─────────────────────────────────────────────
        // GET api/fixtures/generate-preview  (Admin only)
        // ─────────────────────────────────────────────
        [HttpGet("generate-preview")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetGeneratePreview([FromQuery] string division = "D1")
        {
            var season = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue)
                return BadRequest(ApiResponse<object>.Fail("ไม่พบ Season ปัจจุบัน"));

            // ALWAYS get players directly from tbm_user (User table) filtered by division, excluding admins
            var players = await _db.Users
                .Where(u => u.UserLevel != "admin" && u.CurrentDivision == division)
                .ToListAsync();

            int n = players.Count;
            bool isEven = n % 2 == 0;
            int rounds = isEven ? n - 1 : n;
            int perRound = isEven ? n / 2 : (n - 1) / 2;
            int leg1Matches = rounds * perRound;

            var existingCount = await _db.TbmFixtureAlls
                .CountAsync(f => f.Season == season && f.Platform == "PC" && f.Division == division);

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
        public async Task<IActionResult> GenerateFixture([FromQuery] string division = "D1")
        {
            var season = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            if (!season.HasValue)
                return BadRequest(ApiResponse<object>.Fail("ไม่พบ Season ปัจจุบัน"));

            // Block if fixtures already exist in test table
            var existingCount = await _db.TbmFixtureAlls
                .CountAsync(f => f.Season == season && f.Platform == "PC" && f.Division == division);

            if (existingCount > 0)
                return BadRequest(ApiResponse<object>.Fail($"Season {season.Value} มี Fixture ใน Division {division} อยู่แล้ว {existingCount} รายการ ไม่สามารถ Generate ซ้ำได้"));

            // Check Quotas before generating
            var quotaCheck = await _auctionService.ValidateAllQuotasAsync();
            if (!quotaCheck.Success)
            {
                return BadRequest(ApiResponse<object>.Fail(quotaCheck.Message, quotaCheck.FailedUsers));
            }

            // ALWAYS get players directly from tbm_user (User table) filtered by division, excluding admins
            var users = await _db.Users
                .Where(u => u.UserLevel != "admin" && u.CurrentDivision == division)
                .ToListAsync();

            if (users.Count < 2)
                return BadRequest(ApiResponse<object>.Fail("ต้องมีผู้เล่นอย่างน้อย 2 คน"));

            var userIds = users.Select(u => u.UserId).ToList();
            var fixtures = GenerateRoundRobin(userIds);
            
            // Calculate total players to offset Leg 2 matchday by number of teams (e.g. if 18 teams, Leg 2 starts at 18 + 1 = 19)
            int totalPlayers = userIds.Count;
            
            var fixtureInsert = new List<TbmFixtureAll>();
            var teamInsert = new List<TbmTeam>();

            // 1. เตรียมข้อมูล Fixtures (ใช้ UserId สำหรับ Home/Away)
            // Leg 1 — ACTIVE='NO' (Default to hidden/not open)
            foreach (var (home, away, matchday) in fixtures)
            {
                fixtureInsert.Add(new TbmFixtureAll
                {
                    FixtureId = Guid.NewGuid().ToString(),
                    Division = division,
                    Match = matchday,
                    Home = home, // UserId
                    Away = away, // UserId
                    Active = "NO",
                    Season = season.Value,
                    Platform = "PC",
                    Leg = 1
                });
            }

            // Leg 2 — ACTIVE='NO', Home/Away สลับ, Matchday เลื่อนต่อจาก Leg 1 โดยบวกด้วยจำนวนทีม
            foreach (var (home, away, matchday) in fixtures)
            {
                fixtureInsert.Add(new TbmFixtureAll
                {
                    FixtureId = Guid.NewGuid().ToString(),
                    Division = division,
                    Match = matchday + totalPlayers,
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
                    t.Platform == "PC" &&
                    t.Division == division);

                if (!exists)
                {
                    teamInsert.Add(new TbmTeam
                    {
                        Player = u.UserId,
                        Division = division,
                        Season = season.Value,
                        Platform = "PC",
                        TeamName = !string.IsNullOrEmpty(u.CurrentTeam) ? u.CurrentTeam : (u.LineName ?? u.UserId)
                    });
                }
            }

            // บันทึกข้อมูลทั้งหมดภายใต้ execution strategy เพื่อรองรับ SqlServerRetryingExecutionStrategy
            var strategy = _db.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using (var transaction = await _db.Database.BeginTransactionAsync())
                {
                    try
                    {
                        await _db.TbmFixtureAlls.AddRangeAsync(fixtureInsert);
                        await _db.TbmTeams.AddRangeAsync(teamInsert);
                        await _db.SaveChangesAsync();
                        await transaction.CommitAsync();

                        return (IActionResult)Ok(ApiResponse<object>.Ok(new
                        {
                            message = $"Generate สำเร็จ! สร้าง {fixtureInsert.Count} fixtures และ {teamInsert.Count} team entries (Season {season.Value})",
                            matchCount = fixtureInsert.Count,
                            teamCount = teamInsert.Count,
                            season = season.Value
                        }));
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        var errorMsg = ex.InnerException?.Message ?? ex.Message;
                        return (IActionResult)BadRequest(ApiResponse<object>.Fail("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + errorMsg));
                    }
                }
            });
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
                                .Where(f => f.Season == season.Value && f.Platform == "PC" && f.Division == request.Division)
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
                                .Where(t => t.Season == season.Value && t.Platform == "PC" && t.Division == request.Division)
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

            // Dictionary to keep track of home match counts for each player
            var homeCounts = new Dictionary<string, int>();
            foreach (var p in players)
            {
                homeCounts[p] = 0;
            }

            for (int r = 0; r < rounds; r++)
            {
                for (int i = 0; i < perRound; i++)
                {
                    string a = arr[i];
                    string b = arr[total - 1 - i];
                    if (a != "BYE" && b != "BYE")
                    {
                        string home, away;
                        int aHomeCount = homeCounts[a];
                        int bHomeCount = homeCounts[b];

                        if (aHomeCount < bHomeCount)
                        {
                            home = a;
                            away = b;
                        }
                        else if (bHomeCount < aHomeCount)
                        {
                            home = b;
                            away = a;
                        }
                        else
                        {
                            if ((r + i) % 2 == 0)
                            {
                                home = a;
                                away = b;
                            }
                            else
                            {
                                home = b;
                                away = a;
                            }
                        }

                        homeCounts[home]++;
                        result.Add((home, away, r + 1));
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
