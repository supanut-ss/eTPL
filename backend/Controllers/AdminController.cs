using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Auction;
using eTPL.API.Models.Scaffolded;
using HtmlAgilityPack;
using System.Net.Http;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly ScaffoldedDbContext _scaffoldedContext;
        private readonly HttpClient _httpClient;

        public AdminController(MsSqlDbContext context, ScaffoldedDbContext scaffoldedContext)
        {
            _context = context;
            _scaffoldedContext = scaffoldedContext;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.UserId, u.LineName, u.LinePic })
                .ToListAsync();
            return Ok(users);
        }

        [HttpPost("scrape-player/{id}")]
        public async Task<IActionResult> ScrapeAndAddPlayer(int id)
        {
            try
            {
                var existing = await _context.PesPlayerTeams.FirstOrDefaultAsync(p => p.IdPlayer == id);
                if (existing != null)
                {
                    return BadRequest(new { message = "Player already exists in the system." });
                }

                string url = $"https://pesdb.net/efootball/?id={id}&mode=max_level";
                var response = await _httpClient.GetStringAsync(url);
                
                var doc = new HtmlDocument();
                doc.LoadHtml(response);

                var player = new PesPlayerTeam { IdPlayer = id };

                player.PlayerName = CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Player Name:']/following-sibling::td")?.InnerText ?? "");
                
                var ovrNode = doc.DocumentNode.SelectSingleNode("//td[text()='Overall Rating:']/following-sibling::td/b");
                if (ovrNode != null)
                {
                    // Some ratings are like "80 (+12)", we want the first part
                    var parts = ovrNode.InnerText.Trim().Split(' ');
                    if (int.TryParse(parts[0], out int ovr))
                    {
                        player.PlayerOvr = ovr;
                    }
                }

                player.TeamName = CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Team Name:']/following-sibling::td/a")?.InnerText ?? "");
                player.League = CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='League:']/following-sibling::td/a")?.InnerText ?? "");
                player.Position = CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Position:']/following-sibling::td")?.InnerText ?? "");
                player.PlayingStyle = CleanString(doc.DocumentNode.SelectSingleNode("//th[text()='Playing Style']/parent::tr/following-sibling::tr/td")?.InnerText ?? "");
                
                player.Height = ParseInt(CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Height:']/following-sibling::td")?.InnerText ?? ""));
                player.Weight = ParseInt(CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Weight:']/following-sibling::td")?.InnerText ?? ""));
                player.Age = ParseInt(CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Age:']/following-sibling::td")?.InnerText ?? ""));

                player.Foot = CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Foot:']/following-sibling::td")?.InnerText ?? "");
                player.Nationality = CleanString(doc.DocumentNode.SelectSingleNode("//td[text()='Nationality:']/following-sibling::td/a")?.InnerText ?? "");

                if (string.IsNullOrEmpty(player.PlayerName))
                {
                    return NotFound(new { message = "Could not find player data on pesdb. Check if the ID is correct." });
                }

                _context.PesPlayerTeams.Add(player);
                await _context.SaveChangesAsync();

                return Ok(player);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error scraping player: " + ex.Message });
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
                 return StatusCode(500, new { message = "Error adding HOF: " + ex.Message });
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
}
