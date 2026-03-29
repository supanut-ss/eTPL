using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/fixtures")]
    [Authorize]
    public class FixtureController : ControllerBase
    {
        private readonly ScaffoldedDbContext _db;

        public FixtureController(ScaffoldedDbContext db)
        {
            _db = db;
        }

        // GET api/fixtures?search=teamA
        [HttpGet]
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
            var fixtureIds = data.Select(f => f.FixtureId).ToList();
            var cardData = await _db.TbmFixtureAlls
                .Where(f => fixtureIds.Contains(f.FixtureId))
                .Select(f => new { f.FixtureId, f.HomeYellow, f.HomeRed, f.AwayYellow, f.AwayRed })
                .ToDictionaryAsync(f => f.FixtureId);

            var result = data.Select(f =>
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

            var fixtureIds = data.Select(f => f.FixtureId).ToList();
            var cardData = await _db.TbmFixtureAlls
                .Where(f => fixtureIds.Contains(f.FixtureId))
                .Select(f => new { f.FixtureId, f.HomeYellow, f.HomeRed, f.AwayYellow, f.AwayRed })
                .ToDictionaryAsync(f => f.FixtureId);

            var result = data.Select(f =>
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

            var fixtureIds = data.Select(f => f.FixtureId).ToList();
            var cardData = await _db.TbmFixtureAlls
                .Where(f => fixtureIds.Contains(f.FixtureId))
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
        public async Task<IActionResult> ReportResult(string fixtureId, [FromBody] ReportResultDto dto)
        {
            // 1. ดึงข้อมูล fixture จาก tbm_fixture_all
            var fixture = await _db.TbmFixtureAlls
                .FirstOrDefaultAsync(f => f.FixtureId == fixtureId);

            if (fixture == null)
                return NotFound(ApiResponse<object>.Fail("ไม่พบ Fixture นี้"));

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

            return Ok(ApiResponse<object>.Ok(new { message = "บันทึกผลสำเร็จ" }));
        }

        // PUT api/fixtures/{fixtureId}/report  (admin only — แก้ไขผลที่บันทึกแล้ว)
        [HttpPut("{fixtureId}/report")]
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

            return Ok(ApiResponse<object>.Ok(new { message = "แก้ไขผลสำเร็จ" }));
        }
    }
}

