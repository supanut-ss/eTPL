using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HofController : ControllerBase
    {
        private readonly ScaffoldedDbContext _context;

        public HofController(ScaffoldedDbContext context)
        {
            _context = context;
            try { EnsureTableExists(); } catch (Exception ex) { Console.WriteLine("HOF Init Error: " + ex.Message); }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TbmHof>>> GetHof()
        {
            try 
            {
                EnsureTableExists();
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

        [HttpPost("seed")]
        public async Task<IActionResult> Seed()
        {
            EnsureTableExists();
            await SeedMockData();
            return Ok("Mock data seeded successfully.");
        }

        private void EnsureTableExists()
        {
            // Check if table exists and has the new structure in dbo schema
            var checkSql = "SELECT COUNT(*) FROM sys.columns WHERE Name = 'TournamentTitle' AND Object_ID = OBJECT_ID(N'[dbo].[tbs_hof]')";
            var count = 0;
            
            try {
                // We use a safe way to check column existence
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = checkSql;
                    count = Convert.ToInt32(cmd.ExecuteScalar());
                }
            } catch {
                // If query fails, table might not exist
            }

            if (count == 0)
            {
                // Drop if old table exists to avoid conflicts with new schema
                var dropSql = "IF OBJECT_ID(N'[dbo].[tbs_hof]', 'U') IS NOT NULL DROP TABLE [dbo].[tbs_hof]";
                _context.Database.ExecuteSqlRaw(dropSql);

                var createSql = @"
                CREATE TABLE [dbo].[tbs_hof](
                    [hof_id] [varchar](50) NOT NULL DEFAULT (newid()),
                    [Platform] [nvarchar](50) NULL,
                    [Season] [nvarchar](50) NULL,
                    [TournamentTitle] [nvarchar](255) NULL,
                    [TournamentSubtitle] [nvarchar](255) NULL,
                    [WinnerName] [nvarchar](255) NULL,
                    [WinnerTeam] [nvarchar](255) NULL,
                    [WinnerImage] [nvarchar](500) NULL,
                    [RunnerUpName] [nvarchar](255) NULL,
                    [DisplayColor] [nvarchar](50) NULL,
                    PRIMARY KEY CLUSTERED ([hof_id] ASC)
                )";
                _context.Database.ExecuteSqlRaw(createSql);
            }
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
