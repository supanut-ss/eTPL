using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;

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
        // default: platform=PC, division=D1, season=current season
        // user level: จะเห็นเฉพาะ match ที่ home หรือ away ตรงกับ userId ของตัวเอง
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
                .Where(f => f.Platform == "PC" && f.Division == "D1");

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

            // user level เห็นเฉพาะ match ของตัวเอง
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

            return Ok(ApiResponse<object>.Ok(data));
        }

        // PUT api/fixtures/{id}/score — บันทึกผลการแข่งขัน (admin only)
        [HttpPut("{id}/score")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateScore(string id, [FromBody] UpdateScoreRequest request)
        {
            var fixture = await _db.TbmFixtureAlls.FindAsync(id);
            if (fixture == null)
                return NotFound(ApiResponse<object>.Fail("ไม่พบข้อมูล fixture"));

            fixture.HomeScore = request.HomeScore;
            fixture.AwayScore = request.AwayScore;
            fixture.Active = (request.HomeScore != null && request.AwayScore != null) ? "YES" : "NO";

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { fixtureId = id }, "บันทึกผลสำเร็จ"));
        }
    }
}
