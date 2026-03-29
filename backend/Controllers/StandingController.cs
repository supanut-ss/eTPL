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
        public async Task<IActionResult> GetAll()
        {
            var currentSeason = await _db.TbmCurrentSeasons
                .Where(s => s.Platform == "PC")
                .Select(s => s.Season)
                .FirstOrDefaultAsync();

            var query = _db.VResultTables.Where(r => r.Division == "D1");

            if (currentSeason.HasValue)
                query = query.Where(r => r.Season == currentSeason.Value);

            var data = await query
                .OrderByDescending(r => r.Pts)
                .ThenByDescending(r => r.Gd)
                .ThenByDescending(r => r.Gf)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(data));
        }
    }
}
