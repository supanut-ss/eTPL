using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Scaffolded;

using eTPL.API.Models;
namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HofController : ControllerBase
    {
        private readonly MsSqlDbContext _context;

        public HofController(MsSqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TbmHof>>> GetHof()
        {
            try 
            {
                var data = await _context.TbmHofs.ToListAsync();
                
                // Auto seed if empty
                if (data.Count == 0)
                {
                    await SeedMockData();
                    data = await _context.TbmHofs.ToListAsync();
                }
                
                return data;
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateHof(string id, TbmHof hofUpdate)
        {
            
            var existing = await _context.TbmHofs.FindAsync(id);
            if (existing == null) return NotFound("HOF record not found");

            existing.TournamentTitle = hofUpdate.TournamentTitle ?? existing.TournamentTitle;
            existing.TournamentSubtitle = hofUpdate.TournamentSubtitle ?? existing.TournamentSubtitle;
            existing.WinnerName = hofUpdate.WinnerName ?? existing.WinnerName;
            existing.WinnerTeam = hofUpdate.WinnerTeam ?? existing.WinnerTeam;
            existing.Season = hofUpdate.Season ?? existing.Season;
            existing.AiImageUrl = hofUpdate.AiImageUrl ?? existing.AiImageUrl;
            existing.WinnerImage = hofUpdate.WinnerImage ?? existing.WinnerImage;

            // Handle empty string as null for images if they want to clear it
            if (hofUpdate.AiImageUrl == "") existing.AiImageUrl = null;
            if (hofUpdate.WinnerImage == "") existing.WinnerImage = null;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = existing });
        }

        [HttpPost("seed")]
        public async Task<IActionResult> Seed()
        {
            await SeedMockData();
            return Ok("Mock data seeded successfully.");
        }



        private async Task SeedMockData()
        {
            var mockData = new List<TbmHof>
            {
                // League Champions
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "League Champions", TournamentSubtitle = "D1 Division · Top Tier", Season = "Season 5", WinnerName = "RREEF", WinnerTeam = "AZ ALKMAAR", RunnerUpName = "Viper", DisplayColor = "#fbbf24", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=rreef" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "League Champions", TournamentSubtitle = "D1 Division · Top Tier", Season = "Season 4", WinnerName = "Alice", WinnerTeam = "FC Porto", RunnerUpName = "Bob", DisplayColor = "#fbbf24", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=alice" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "League Champions", TournamentSubtitle = "D1 Division · Top Tier", Season = "Season 3", WinnerName = "Zlatan", WinnerTeam = "Milan", RunnerUpName = "Rooney", DisplayColor = "#fbbf24", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=zlatan" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "League Champions", TournamentSubtitle = "D1 Division · Top Tier", Season = "Season 2", WinnerName = "Messi", WinnerTeam = "Barcelona", RunnerUpName = "CR7", DisplayColor = "#fbbf24", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=messi" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "League Champions", TournamentSubtitle = "D1 Division · Top Tier", Season = "Season 1", WinnerName = "RREEF", WinnerTeam = "Santos", RunnerUpName = "Pele", DisplayColor = "#fbbf24", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=rreef" },
                
                // eTPL Cup
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "eTPL Cup", TournamentSubtitle = "Major Domestic Cup", Season = "Season 5", WinnerName = "Viper", WinnerTeam = "Man City", RunnerUpName = "RREEF", DisplayColor = "#6366f1", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=viper" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "eTPL Cup", TournamentSubtitle = "Major Domestic Cup", Season = "Season 4", WinnerName = "Charlie", WinnerTeam = "Inter", RunnerUpName = "Alice", DisplayColor = "#6366f1", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=charlie" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "eTPL Cup", TournamentSubtitle = "Major Domestic Cup", Season = "Season 3", WinnerName = "Rooney", WinnerTeam = "Man Utd", RunnerUpName = "Zlatan", DisplayColor = "#6366f1", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=rooney" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "eTPL Cup", TournamentSubtitle = "Major Domestic Cup", Season = "Season 2", WinnerName = "TPL_HZ1", WinnerTeam = "Bayern", RunnerUpName = "RREEF", DisplayColor = "#6366f1", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=tplhz1" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "eTPL Cup", TournamentSubtitle = "Major Domestic Cup", Season = "Season 1", WinnerName = "RREEF", WinnerTeam = "Palmeiras", RunnerUpName = "Viper", DisplayColor = "#6366f1", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=rreef" },

                // Elite Champions
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "Elite Champions", TournamentSubtitle = "Cross-platform Tournament", Season = "Season 5", WinnerName = "RREEF", WinnerTeam = "AZ ALKMAAR", RunnerUpName = "Alice", DisplayColor = "#818cf8", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=rreef" },
                new TbmHof { HofId = Guid.NewGuid().ToString(), TournamentTitle = "Elite Champions", TournamentSubtitle = "Cross-platform Tournament", Season = "Season 4", WinnerName = "Zlatan", WinnerTeam = "Milan", RunnerUpName = "Viper", DisplayColor = "#818cf8", Platform = "PC", WinnerImage = "https://i.pravatar.cc/150?u=zlatan" }
            };

            _context.TbmHofs.AddRange(mockData);
            await _context.SaveChangesAsync();
        }
    }
}

