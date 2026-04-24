using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Auction;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Data.Scaffolded;
using HtmlAgilityPack;
using System.Net.Http;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin,moderator")]
    public class AdminController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly ScaffoldedDbContext _scaffoldedContext;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public AdminController(MsSqlDbContext context, ScaffoldedDbContext scaffoldedContext, IConfiguration config)
        {
            _context = context;
            _scaffoldedContext = scaffoldedContext;
            _config = config;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.UserId, u.LineName, u.LinePic })
                .ToListAsync();
            return Ok(users);
        }

        [HttpPost("scrape-player/{id}")]
        public async Task<IActionResult> ScrapeAndAddPlayer(int id)
        {
            try
            {
                var existing = await _context.PesPlayerTeams.FirstOrDefaultAsync(p => p.IdPlayer == id);
                
                string url = $"https://pesdb.net/efootball/?id={id}";
                var response = await _httpClient.GetStringAsync(url);
                
                var doc = new HtmlDocument();
                doc.LoadHtml(response);

                var player = new PesPlayerTeam { IdPlayer = id };

                // Use the user-provided XPaths for better accuracy
                var spanOvr = doc.DocumentNode.SelectSingleNode("//span[@class='c0' and @id='a0']");
                if (spanOvr != null && int.TryParse(spanOvr.InnerText, out int overall))
                {
                    player.PlayerOvr = overall;
                }
                else
                {
                    // Fallback to old method if span not found
                    var ovrNode = doc.DocumentNode.SelectSingleNode("//td[text()='Overall Rating:']/following-sibling::td/b");
                    if (ovrNode != null)
                    {
                        var parts = ovrNode.InnerText.Trim().Split(' ');
                        if (int.TryParse(parts[0], out int ovr)) player.PlayerOvr = ovr;
                    }
                }

                player.PlayerName = CleanString(doc.DocumentNode.SelectSingleNode("//tr/th[text()='Player Name:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Player Name:']/following-sibling::td")?.InnerText 
                    ?? "");

                player.TeamName = CleanString(doc.DocumentNode.SelectSingleNode("//tr/th[text()='Team Name:']/following-sibling::td/span/a")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Team Name:']/following-sibling::td/a")?.InnerText 
                    ?? "");

                player.League = CleanString(doc.DocumentNode.SelectSingleNode("//tr/th[text()='League:']/following-sibling::td/span/a")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='League:']/following-sibling::td/a")?.InnerText 
                    ?? "");

                player.Nationality = CleanString(
                    doc.DocumentNode.SelectSingleNode("//tr/th[text()='Nationality:']/following-sibling::td/span/a")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Nationality:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Nationality:']/following-sibling::td/a")?.InnerText 
                    ?? "");

                player.Position = CleanString(doc.DocumentNode.SelectSingleNode("//tr/th[text()='Position:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Position:']/following-sibling::td")?.InnerText 
                    ?? "");

                var playingStyleNode = doc.DocumentNode.SelectSingleNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td/span/a")
                    ?? doc.DocumentNode.SelectSingleNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td/span")
                    ?? doc.DocumentNode.SelectSingleNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td")
                    ?? doc.DocumentNode.SelectSingleNode("//table[contains(@class,'playing_styles')]//tr[th[contains(normalize-space(.),'Playing Style')]]/following-sibling::tr[1]/td")
                    ?? doc.DocumentNode.SelectSingleNode("//th[text()='Playing Style']/parent::tr/following-sibling::tr/td");
                
                player.PlayingStyle = CleanString(playingStyleNode?.InnerText ?? "");

                player.Foot = CleanString(doc.DocumentNode.SelectSingleNode("//tr/th[text()='Foot:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Foot:']/following-sibling::td")?.InnerText 
                    ?? "");

                player.Height = ParseInt(CleanString(
                    doc.DocumentNode.SelectSingleNode("//tr/th[text()='Height (cm):']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Height:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Height:']/following-sibling::td")?.InnerText 
                    ?? ""));

                player.Weight = ParseInt(CleanString(
                    doc.DocumentNode.SelectSingleNode("//tr/th[text()='Weight (kg):']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Weight:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Weight:']/following-sibling::td")?.InnerText 
                    ?? ""));

                player.Age = ParseInt(CleanString(
                    doc.DocumentNode.SelectSingleNode("//tr/th[text()='Age:']/following-sibling::td/span")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Age:']/following-sibling::td")?.InnerText 
                    ?? doc.DocumentNode.SelectSingleNode("//td[text()='Age:']/following-sibling::td")?.InnerText 
                    ?? ""));

                if (string.IsNullOrEmpty(player.PlayerName))
                {
                    return NotFound(new { message = "Could not find player data on pesdb. Check if the ID is correct or site structure changed." });
                }

                if (existing != null)
                {
                    _context.Entry(existing).CurrentValues.SetValues(player);
                }
                else
                {
                    _context.PesPlayerTeams.Add(player);
                }

                await _context.SaveChangesAsync();

                return Ok(player);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error scraping player: " + ex.Message });
            }
        }

        [HttpPost("add-player-manual")]
        public async Task<IActionResult> AddPlayerManual([FromBody] PesPlayerTeam player)
        {
            try
            {
                if (player.IdPlayer <= 0)
                {
                    return BadRequest(new { message = "Valid Player ID is required." });
                }

                var existing = await _context.PesPlayerTeams.FirstOrDefaultAsync(p => p.IdPlayer == player.IdPlayer);
                if (existing != null)
                {
                    // Update existing instead of error? Or just error? Let's update to be helpful.
                    _context.Entry(existing).CurrentValues.SetValues(player);
                }
                else
                {
                    _context.PesPlayerTeams.Add(player);
                }

                await _context.SaveChangesAsync();
                return Ok(player);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding manual player: " + ex.Message });
            }
        }

        [HttpPost("add-hof")]
        public async Task<IActionResult> AddHof([FromBody] TbmHof hof)
        {
            try
            {
                // Request says: "รูปจะดึงลิงค์ จาก user ถ้า user_id ตรงกัน"
                // Check if WinnerName matches a UserId or LineName to get their profile pic
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == hof.WinnerName || u.LineName == hof.WinnerName);
                if (user != null && !string.IsNullOrEmpty(user.LinePic))
                {
                    hof.WinnerImage = user.LinePic;
                }

                if (string.IsNullOrEmpty(hof.HofId))
                {
                    hof.HofId = Guid.NewGuid().ToString();
                }

                _scaffoldedContext.TbmHofs.Add(hof);
                await _scaffoldedContext.SaveChangesAsync();

                return Ok(hof);
            }
            catch (Exception ex)
            {
                 var innerMsg = ex.InnerException != null ? ex.InnerException.Message : "";
                 return StatusCode(500, new { message = $"Error adding HOF: {ex.Message} {innerMsg}" });
            }
        }

        [HttpGet("get-user-team")]
        public async Task<IActionResult> GetUserTeam(string userId, string platform, string season)
        {
            try 
            {
                int? uId = int.TryParse(userId, out int u) ? u : null;
                int? sNo = int.TryParse(season, out int s) ? s : null;

                var team = await _scaffoldedContext.TbmTeams
                    .Where(t => t.UserId == uId && t.Platform == platform && t.Season == sNo)
                    .Select(t => t.TeamName)
                    .FirstOrDefaultAsync();
                
                return Ok(new { teamName = team ?? "" });
            }
            catch (Exception ex)
            {
                return Ok(new { teamName = "", error = ex.Message });
            }
        }


        [HttpGet("quota-summary")]
        public async Task<IActionResult> GetQuotaSummary()
        {
            try
            {
                var settings = await _context.AuctionSettings.FirstOrDefaultAsync();
                var maxSquadSize = settings?.MaxSquadSize ?? 23;
                
                var grades = await _context.AuctionGradeQuotas.OrderBy(g => g.GradeId).ToListAsync();
                var squads = await _context.AuctionSquads
                    .Include(s => s.Player)
                    .ToListAsync(); // Get all to count Loaned out too

                var users = await _context.Users.ToListAsync();

                var summary = users.Select(user => new
                {
                    UserId = user.UserId,
                    LineName = user.LineName ?? "No Name",
                    Id = user.Id,
                    Grades = grades.Select(grade => new
                    {
                        GradeName = grade.GradeName,
                        Count = squads.Where(s => s.UserId == user.Id && s.Status == "Active" && s.Player != null)
                                      .Count(s => s.Player!.PlayerOvr >= grade.MinOVR && s.Player.PlayerOvr <= grade.MaxOVR),
                        Limit = grade.MaxAllowedPerUser
                    }).ToList(),
                    LoanInCount = squads.Count(s => s.UserId == user.Id && s.IsLoan && s.Status == "Active"),
                    LoanOutCount = squads.Count(s => s.UserId == user.Id && s.Status == "Loaned"),
                    TotalPlayers = squads.Count(s => s.UserId == user.Id && s.Status == "Active"), // Only active ones count towards main squad limit
                    MaxLimit = maxSquadSize
                }).OrderBy(u => u.UserId).ToList();

                return Ok(new { grades, summary, maxLimit = maxSquadSize });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Quota Error] {ex.Message}");
                return StatusCode(500, new { message = "Error fetching quota summary: " + ex.Message });
            }
        }

        [HttpGet("prizes")]
        public async Task<IActionResult> GetPrizes()
        {
            try
            {
                var prizes = await _scaffoldedContext.TbsPrizeSettings
                    .OrderBy(p => p.SortOrder)
                    .ToListAsync();
                return Ok(prizes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching prizes: " + ex.Message });
            }
        }

        [HttpPost("prizes")]
        public async Task<IActionResult> SavePrizes([FromBody] SavePrizesRequest request)
        {
            try
            {
                var prizeSettings = request.Prizes;


                // Clear existing settings
                var existing = await _scaffoldedContext.TbsPrizeSettings.ToListAsync();
                _scaffoldedContext.TbsPrizeSettings.RemoveRange(existing);

                // Add new settings with sort order and auto-parsing positions
                for (int i = 0; i < prizeSettings.Count; i++)
                {
                    prizeSettings[i].Id = 0;
                    prizeSettings[i].SortOrder = i;

                    // Try to auto-parse PositionStart and PositionEnd from RankLabel
                    try 
                    {
                        string label = prizeSettings[i].RankLabel ?? "";
                        if (label.Contains("-"))
                        {
                            var parts = label.Split('-');
                            if (int.TryParse(new string(parts[0].Where(char.IsDigit).ToArray()), out int start))
                                prizeSettings[i].PositionStart = start;
                            if (int.TryParse(new string(parts[1].Where(char.IsDigit).ToArray()), out int end))
                                prizeSettings[i].PositionEnd = end;
                        }
                        else if (label.Contains("+"))
                        {
                            if (int.TryParse(new string(label.Where(char.IsDigit).ToArray()), out int start))
                            {
                                prizeSettings[i].PositionStart = start;
                                prizeSettings[i].PositionEnd = 999; // Arbitrary high number for "+"
                            }
                        }
                        else 
                        {
                            if (int.TryParse(new string(label.Where(char.IsDigit).ToArray()), out int pos))
                            {
                                prizeSettings[i].PositionStart = pos;
                                prizeSettings[i].PositionEnd = pos;
                            }
                        }
                    }
                    catch { /* Ignore parsing errors */ }
                }

                await _scaffoldedContext.TbsPrizeSettings.AddRangeAsync(prizeSettings);
                await _scaffoldedContext.SaveChangesAsync();

                return Ok(new { message = "Prize settings saved successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error saving prizes: " + ex.Message });
            }
        }

        private string CleanString(string input)
        {
            if (string.IsNullOrEmpty(input)) return "";
            return System.Net.WebUtility.HtmlDecode(input).Trim();
        }

        private int? ParseInt(string input)
        {
            if (string.IsNullOrEmpty(input)) return null;
            // Handle cases like "180 cm" or "75 kg"
            var digits = new string(input.Where(char.IsDigit).ToArray());
            if (int.TryParse(digits, out int val)) return val;
            return null;
        }
    }

    public class SavePrizesRequest
    {
        public List<TbsPrizeSetting> Prizes { get; set; } = new();
        public string Password { get; set; } = string.Empty;
    }
}
