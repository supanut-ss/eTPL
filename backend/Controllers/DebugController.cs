using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Auction;
using eTPL.API.Models.DTOs;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/debug")]
    public class DebugController : ControllerBase
    {
        private readonly MsSqlDbContext _db;

        public DebugController(MsSqlDbContext db)
        {
            _db = db;
        }

        [HttpGet("suarez")]
        public async Task<IActionResult> CheckSuarez()
        {
            var players = await _db.PesPlayerTeams
                .Where(p => p.PlayerName.ToLower().Contains("suar"))
                .ToListAsync();

            return Ok(players);
        }
    }
}
