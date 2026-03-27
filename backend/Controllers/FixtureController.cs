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
        // default: platform=PC, division=D1, season=current season (from tbm_current_season where platform=PC)
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search)
        {
            // ดึง current season ของ platform PC
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VFixtureAlls
                .Where(f => f.Platform == "PC" && f.Division == "D1");

            if (currentSeason.HasValue)
                query = query.Where(f => f.Season == currentSeason.Value);

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
    }
}
