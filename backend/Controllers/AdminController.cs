using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.Auction;
using eTPL.API.Models.Scaffolded;
using HtmlAgilityPack;
using System.Net.Http;
using eTPL.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin,moderator")]
    public class AdminController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly MsSqlDbContext _scaffoldedContext;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly IHubContext<AuctionHub> _hubContext;

        public AdminController(MsSqlDbContext context, MsSqlDbContext scaffoldedContext, IConfiguration config, IHubContext<AuctionHub> hubContext)
        {
            _context = context;
            _scaffoldedContext = scaffoldedContext;
            _config = config;
            _hubContext = hubContext;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            _httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.UserId, u.LineName, u.LinePic, u.CurrentTeam })
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
                
                var player = ParsePlayerFromHtml(response, id);

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

        public static PesPlayerTeam ParsePlayerFromHtml(string html, int id = 0)
        {
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var player = new PesPlayerTeam { IdPlayer = id };

            // Helper to get text or node from dt/dd
            string GetDtValue(string dtLabel)
            {
                var node = doc.DocumentNode.SelectSingleNode($"//dt[contains(normalize-space(.), '{dtLabel}')]/following-sibling::dd[1]")
                    ?? doc.DocumentNode.SelectSingleNode($"//div[dt[contains(normalize-space(.), '{dtLabel}')]]/dd");
                return node != null ? CleanString(node.InnerText) : "";
            }

            HtmlNode? GetDtNode(string dtLabel)
            {
                return doc.DocumentNode.SelectSingleNode($"//dt[contains(normalize-space(.), '{dtLabel}')]/following-sibling::dd[1]")
                    ?? doc.DocumentNode.SelectSingleNode($"//div[dt[contains(normalize-space(.), '{dtLabel}')]]/dd");
            }

            // 1. Overall Rating: Attribute data-current-overall, <dt>Overall Rating</dt>, Fallback JSON/Meta and Old Structure
            int? overall = null;
            var ovrAttrNode = doc.DocumentNode.SelectSingleNode("//*[@data-current-overall]");
            if (ovrAttrNode != null)
            {
                var ovrVal = ovrAttrNode.GetAttributeValue("data-current-overall", "").Trim();
                if (!string.IsNullOrEmpty(ovrVal) && int.TryParse(ovrVal, out int val))
                    overall = val;
                else if (int.TryParse(CleanString(ovrAttrNode.InnerText), out int txtVal))
                    overall = txtVal;
            }

            if (!overall.HasValue)
            {
                var dtOvr = GetDtValue("Overall Rating");
                if (!string.IsNullOrEmpty(dtOvr)) overall = ParseInt(dtOvr);
            }

            if (!overall.HasValue)
            {
                var spanOvr = doc.DocumentNode.SelectSingleNode("//span[@class='c0' and @id='a0']");
                if (spanOvr != null && int.TryParse(spanOvr.InnerText, out int spanVal))
                {
                    overall = spanVal;
                }
                else
                {
                    var ovrNode = doc.DocumentNode.SelectSingleNode("//tr[th[contains(text(),'Overall Rating')]]/td/b")
                        ?? doc.DocumentNode.SelectSingleNode("//td[text()='Overall Rating:']/following-sibling::td/b");
                    if (ovrNode != null)
                    {
                        var parts = ovrNode.InnerText.Trim().Split(' ');
                        if (int.TryParse(parts[0], out int ovr)) overall = ovr;
                    }
                }
            }

            if (!overall.HasValue)
            {
                var metaDesc = doc.DocumentNode.SelectSingleNode("//meta[@name='description']")?.GetAttributeValue("content", "");
                if (!string.IsNullOrEmpty(metaDesc))
                {
                    var m = System.Text.RegularExpressions.Regex.Match(metaDesc, @"Overall Rating\s+(\d+)");
                    if (m.Success && int.TryParse(m.Groups[1].Value, out int mVal))
                        overall = mVal;
                }
            }

            player.PlayerOvr = overall ?? 0;

            // 2. PlayerName: <h1 id="player-name">, <dt>Player Name</dt>, or old table
            var nameNode = doc.DocumentNode.SelectSingleNode("//h1[@id='player-name']")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Player Name:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Player Name:']/following-sibling::td");
            string playerName = nameNode != null ? CleanString(nameNode.InnerText) : GetDtValue("Player Name");
            if (string.IsNullOrEmpty(playerName))
            {
                var ogTitle = doc.DocumentNode.SelectSingleNode("//meta[@property='og:title']")?.GetAttributeValue("content", "");
                if (!string.IsNullOrEmpty(ogTitle))
                {
                    playerName = ogTitle.Split('-')[0].Trim();
                }
            }
            player.PlayerName = playerName;

            // 3. TeamName & TeamId: <dt>Club</dt><dd> with team_id from href
            var clubNode = GetDtNode("Club")
                ?? doc.DocumentNode.SelectSingleNode("//div[contains(@class,'player-club-row')]//span[2]")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Team Name:']/following-sibling::td/span/a")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Team Name:']/following-sibling::td/a")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Team Name:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Team Name:']/following-sibling::td");
            
            player.TeamName = CleanString(clubNode?.InnerText ?? "");

            var clubLinkNode = clubNode?.SelectSingleNode(".//a")
                ?? doc.DocumentNode.SelectSingleNode("//div[contains(@class,'player-club-row')]//a[contains(@href,'team_id=')]");
            if (clubLinkNode != null)
            {
                var href = clubLinkNode.GetAttributeValue("href", "");
                var match = System.Text.RegularExpressions.Regex.Match(href, @"team_id=(\d+)");
                if (match.Success)
                {
                    player.IdTeam = match.Groups[1].Value;
                }
            }

            // 4. League: <dt>League</dt><dd>
            var leagueNode = GetDtNode("League")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='League:']/following-sibling::td/span/a")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='League:']/following-sibling::td/a")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='League:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='League:']/following-sibling::td");
            player.League = CleanString(leagueNode?.InnerText ?? "");

            // 5. Nationality: <dt>Nationality</dt><dd>
            var natNode = GetDtNode("Nationality")
                ?? doc.DocumentNode.SelectSingleNode("//div[contains(@class,'player-club-row')]//a[contains(@href,'nationality_id=')]")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Nationality:']/following-sibling::td/span/a")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Nationality:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Nationality:']/following-sibling::td/a")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Nationality:']/following-sibling::td");
            player.Nationality = CleanString(natNode?.InnerText ?? "");

            // 6. Position: //*[@data-current-position] or <dt>Primary Position</dt>
            var posNode = doc.DocumentNode.SelectSingleNode("//*[@data-current-position]")
                ?? GetDtNode("Primary Position")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Position:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Position:']/following-sibling::td");
            player.Position = CleanString(posNode?.InnerText ?? "");

            // 7. PlayingStyle: check Attacking and Defensive styles, prioritize non-Basic
            string atkStyle = CleanString(doc.DocumentNode.SelectSingleNode("//div[contains(@class,'playing-style-row')]//span[contains(text(),'Attacking Playing Style')]/following-sibling::strong")?.InnerText 
                ?? GetDtValue("Attacking Playing Style"));
            string defStyle = CleanString(doc.DocumentNode.SelectSingleNode("//div[contains(@class,'playing-style-row')]//span[contains(text(),'Defensive Playing Style')]/following-sibling::strong")?.InnerText 
                ?? GetDtValue("Defensive Playing Style"));

            string chosenStyle = "";
            bool isAtkValid = !string.IsNullOrEmpty(atkStyle) && !atkStyle.Equals("Basic", StringComparison.OrdinalIgnoreCase) && atkStyle != "---";
            bool isDefValid = !string.IsNullOrEmpty(defStyle) && !defStyle.Equals("Basic", StringComparison.OrdinalIgnoreCase) && defStyle != "---";

            if (isAtkValid)
            {
                chosenStyle = atkStyle;
            }
            else if (isDefValid)
            {
                chosenStyle = defStyle;
            }
            else if (!string.IsNullOrEmpty(atkStyle))
            {
                chosenStyle = atkStyle;
            }
            else if (!string.IsNullOrEmpty(defStyle))
            {
                chosenStyle = defStyle;
            }

            if (string.IsNullOrEmpty(chosenStyle))
            {
                var playingStyleNode = GetDtNode("Playing Style")
                    ?? doc.DocumentNode.SelectSingleNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td/span/a")
                    ?? doc.DocumentNode.SelectSingleNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td/span")
                    ?? doc.DocumentNode.SelectSingleNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td")
                    ?? doc.DocumentNode.SelectSingleNode("//table[contains(@class,'playing_styles')]//tr[th[contains(normalize-space(.),'Playing Style')]]/following-sibling::tr[1]/td")
                    ?? doc.DocumentNode.SelectSingleNode("//th[text()='Playing Style']/parent::tr/following-sibling::tr/td");
                chosenStyle = CleanString(playingStyleNode?.InnerText ?? "");
            }
            player.PlayingStyle = chosenStyle;

            // 8. Foot: <dt>Stronger Foot</dt>
            var footNode = GetDtNode("Stronger Foot")
                ?? GetDtNode("Foot")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Foot:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Foot:']/following-sibling::td");
            player.Foot = CleanString(footNode?.InnerText ?? "");

            // 9. Height: <dt>Height</dt>
            var heightNode = GetDtNode("Height")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Height (cm):']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Height:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Height:']/following-sibling::td");
            player.Height = ParseInt(CleanString(heightNode?.InnerText ?? ""));

            // 10. Weight: <dt>Weight</dt>
            var weightNode = GetDtNode("Weight")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Weight (kg):']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Weight:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Weight:']/following-sibling::td");
            player.Weight = ParseInt(CleanString(weightNode?.InnerText ?? ""));

            // 11. Age: <dt>Age</dt>
            var ageNode = GetDtNode("Age")
                ?? doc.DocumentNode.SelectSingleNode("//tr/th[text()='Age:']/following-sibling::td/span")
                ?? doc.DocumentNode.SelectSingleNode("//td[text()='Age:']/following-sibling::td");
            player.Age = ParseInt(CleanString(ageNode?.InnerText ?? ""));

            // Auto-detect player ID if not provided
            if (player.IdPlayer <= 0)
            {
                var inputId = doc.DocumentNode.SelectSingleNode("//input[@name='player_id']")?.GetAttributeValue("value", "");
                if (!string.IsNullOrEmpty(inputId) && int.TryParse(inputId, out int parsedId))
                {
                    player.IdPlayer = parsedId;
                }
                else
                {
                    var canonical = doc.DocumentNode.SelectSingleNode("//link[@rel='canonical']")?.GetAttributeValue("href", "");
                    if (!string.IsNullOrEmpty(canonical))
                    {
                        var m = System.Text.RegularExpressions.Regex.Match(canonical, @"-(\d+)$");
                        if (m.Success && int.TryParse(m.Groups[1].Value, out int cId))
                        {
                            player.IdPlayer = cId;
                        }
                    }
                    else
                    {
                        var cardImg = doc.DocumentNode.SelectSingleNode("//img[@data-player-card-image]")?.GetAttributeValue("src", "");
                        if (!string.IsNullOrEmpty(cardImg))
                        {
                            var m = System.Text.RegularExpressions.Regex.Match(cardImg, @"[bf](\d+)\.png");
                            if (m.Success && int.TryParse(m.Groups[1].Value, out int imgId))
                            {
                                player.IdPlayer = imgId;
                            }
                        }
                    }
                }
            }

            return player;
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

        [HttpDelete("players/{id}")]
        public async Task<IActionResult> DeletePlayer(int id)
        {
            try
            {
                var player = await _context.PesPlayerTeams.FirstOrDefaultAsync(p => p.IdPlayer == id);
                if (player == null) return NotFound(new { message = "Player not found" });

                var squadRecords = await _context.AuctionSquads.Where(s => s.PlayerId == id).ToListAsync();
                if (squadRecords.Any())
                {
                    var squadIds = squadRecords.Select(s => s.SquadId).ToList();
                    var offers = await _context.TransferOffers.Where(o => squadIds.Contains(o.SquadId)).ToListAsync();
                    if (offers.Any()) _context.TransferOffers.RemoveRange(offers);
                    _context.AuctionSquads.RemoveRange(squadRecords);
                }

                var auctions = await _context.AuctionBoards.Where(a => a.PlayerId == id).ToListAsync();
                if (auctions.Any())
                {
                    var auctionIds = auctions.Select(a => a.AuctionId).ToList();
                    var bidLogs = await _context.AuctionBidLogs.Where(b => auctionIds.Contains(b.AuctionId)).ToListAsync();
                    if (bidLogs.Any()) _context.AuctionBidLogs.RemoveRange(bidLogs);
                    _context.AuctionBoards.RemoveRange(auctions);
                }

                var favs = await _context.AuctionFavourites.Where(f => f.PlayerId == id).ToListAsync();
                if (favs.Any()) _context.AuctionFavourites.RemoveRange(favs);

                _context.PesPlayerTeams.Remove(player);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Player {player.PlayerName} (ID: {id}) deleted successfully from the system" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting player: " + ex.Message });
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

        [HttpGet("club-logos")]
        public async Task<IActionResult> GetClubLogos()
        {
            try
            {
                var logos = await _context.ClubLogos
                    .OrderBy(l => l.LogoName)
                    .Select(l => l.LogoName)
                    .ToListAsync();
                return Ok(logos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching club logos: " + ex.Message });
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

        public static string CleanString(string input)
        {
            if (string.IsNullOrEmpty(input)) return "";
            return System.Net.WebUtility.HtmlDecode(input).Trim();
        }

        public static int? ParseInt(string input)
        {
            if (string.IsNullOrEmpty(input)) return null;
            // Handle cases like "180 cm" or "75 kg"
            var digits = new string(input.Where(char.IsDigit).ToArray());
            if (int.TryParse(digits, out int val)) return val;
            return null;
        }

        // --- Final Bid Refund Recovery ---
        /// <summary>
        /// คืนเงิน Final Bid ให้ผู้แพ้ในรอบ Final ที่ยังไม่ได้รับเงินคืน (Sold auctions เท่านั้น)
        /// เนื่องจาก bug ที่ check AUCTION_REFUND แทนที่จะเป็น FINAL_BID_REFUND
        /// Safe to run multiple times (idempotent) — ตรวจสอบก่อนว่าเคย refund ไปแล้วหรือยัง
        /// ?dryRun=true เพื่อดูว่าจะ refund ใครบ้างก่อนที่จะยืนยัน
        /// </summary>
        [HttpPost("recover-final-bid-refunds")]
        public async Task<IActionResult> RecoverFinalBidRefunds([FromQuery] bool dryRun = true)
        {
            try
            {
                // Find all Sold auctions that had a Final Bid phase (i.e., have Final bid logs)
                var soldAuctions = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .Where(b => b.DbStatus == "Sold")
                    .ToListAsync();

                var auctionIds = soldAuctions.Select(a => a.AuctionId).ToList();

                // Get all Final bids for these auctions
                var allFinalBids = await _context.AuctionBidLogs
                    .Where(l => auctionIds.Contains(l.AuctionId) && l.Phase == "Final")
                    .ToListAsync();

                // Get existing FINAL_BID_REFUND transactions
                var existingRefunds = await _context.AuctionTransactions
                    .Where(t => auctionIds.Contains(t.RelatedAuctionId ?? 0) && t.Type == "FINAL_BID_REFUND")
                    .Select(t => new { t.UserId, t.RelatedAuctionId })
                    .ToListAsync();

                var existingRefundSet = existingRefunds
                    .Select(r => $"{r.UserId}_{r.RelatedAuctionId}")
                    .ToHashSet();

                var preview = new List<object>();
                int totalRefunded = 0;

                foreach (var auction in soldAuctions)
                {
                    var finalBids = allFinalBids
                        .Where(l => l.AuctionId == auction.AuctionId)
                        .OrderByDescending(l => l.BidAmount)
                        .ThenByDescending(l => l.UserId == auction.HighestBidderId)
                        .ThenBy(l => l.CreatedAt)
                        .ToList();

                    if (!finalBids.Any()) continue;

                    // Winner is the highest final bidder (already determined by CurrentPrice on Sold auction)
                    int winnerId = finalBids.First().UserId;

                    foreach (var bid in finalBids)
                    {
                        if (bid.UserId == winnerId) continue;

                        string key = $"{bid.UserId}_{auction.AuctionId}";
                        if (existingRefundSet.Contains(key)) continue; // Already refunded

                        int refundAmount = bid.BidAmount;
                        if (auction.HighestBidderId == bid.UserId)
                        {
                            // This user also led Normal phase, so they already paid CurrentPrice in Normal
                            // PlaceFinalBidAsync only deducted the difference (BidAmount - CurrentPrice)
                            refundAmount = bid.BidAmount - auction.CurrentPrice;
                        }

                        if (refundAmount <= 0) continue;

                        preview.Add(new
                        {
                            AuctionId = auction.AuctionId,
                            PlayerName = auction.Player?.PlayerName ?? "Unknown",
                            UserId = bid.UserId,
                            RefundAmount = refundAmount,
                            FinalBidAmount = bid.BidAmount,
                            Note = auction.HighestBidderId == bid.UserId ? "Was Normal winner too" : "Final bidder only"
                        });

                        if (!dryRun)
                        {
                            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == bid.UserId);
                            if (wallet != null)
                            {
                                wallet.AvailableBalance += refundAmount;
                                wallet.ReservedBalance -= refundAmount;

                                _context.AuctionTransactions.Add(new AuctionTransaction
                                {
                                    UserId = bid.UserId,
                                    Amount = refundAmount,
                                    Direction = "CREDIT",
                                    Type = "FINAL_BID_REFUND",
                                    Description = $"[Recovery] คืนเงินประมูลไม่ชนะรอบ Final {auction.Player?.PlayerName ?? ""}",
                                    BalanceAfter = wallet.AvailableBalance,
                                    RelatedAuctionId = auction.AuctionId,
                                    RelatedPlayerId = auction.PlayerId,
                                    CreatedAt = DateTime.UtcNow
                                });

                                totalRefunded++;
                            }
                        }
                    }
                }

                if (!dryRun && totalRefunded > 0)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new
                {
                    DryRun = dryRun,
                    TotalRefundsToProcess = preview.Count,
                    TotalRefundsExecuted = dryRun ? 0 : totalRefunded,
                    Refunds = preview,
                    Message = dryRun
                        ? $"DRY RUN: พบ {preview.Count} รายการที่ต้องคืนเงิน — เรียก ?dryRun=false เพื่อยืนยัน"
                        : $"คืนเงินสำเร็จ {totalRefunded} รายการ"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Recovery failed: " + ex.Message });
            }
        }

        // --- Bot Q&A Management ---
        [HttpGet("qa")]
        public async Task<IActionResult> GetQa()
        {
            try
            {
                var qas = await _context.QaInformation.OrderBy(q => q.Id).ToListAsync();
                return Ok(qas);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching Q&A data: " + ex.Message });
            }
        }

        [HttpPost("qa")]
        public async Task<IActionResult> AddQa([FromBody] QaInformation qa)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(qa.Question) || string.IsNullOrWhiteSpace(qa.Answer))
                {
                    return BadRequest(new { message = "Question and Answer are required." });
                }

                _context.QaInformation.Add(qa);
                await _context.SaveChangesAsync();
                return Ok(qa);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding Q&A: " + ex.Message });
            }
        }

        [HttpDelete("qa/{id}")]
        public async Task<IActionResult> DeleteQa(int id)
        {
            try
            {
                var qa = await _context.QaInformation.FindAsync(id);
                if (qa == null) return NotFound();

                _context.QaInformation.Remove(qa);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Q&A deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting Q&A: " + ex.Message });
            }
        }

        [HttpGet("auctions")]
        public async Task<IActionResult> GetAuctions([FromQuery] string searchTerm = "")
        {
            var query = _context.AuctionBoards
                .Include(b => b.Player)
                .Include(b => b.HighestBidder)
                .Include(b => b.Initiator)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(b => b.Player != null && b.Player.PlayerName.Contains(searchTerm));
            }

            var auctions = await query
                .OrderByDescending(b => b.AuctionId)
                .Select(b => new {
                    b.AuctionId,
                    b.PlayerId,
                    PlayerName = b.Player != null ? b.Player.PlayerName : "Unknown",
                    PlayerOvr = b.Player != null ? b.Player.PlayerOvr : 0,
                    Position = b.Player != null ? b.Player.Position : "",
                    
                    // Dynamic CurrentPrice: use highest Final bid if exists, otherwise b.CurrentPrice (Normal bid)
                    CurrentPrice = _context.AuctionBidLogs
                        .Where(l => l.AuctionId == b.AuctionId && l.Phase == "Final")
                        .OrderByDescending(l => l.BidAmount)
                        .Select(l => (int?)l.BidAmount)
                        .FirstOrDefault() ?? b.CurrentPrice,

                    HighestBidderId = _context.AuctionBidLogs
                        .Where(l => l.AuctionId == b.AuctionId && l.Phase == "Final")
                        .OrderByDescending(l => l.BidAmount)
                        .ThenBy(l => l.UserId == b.HighestBidderId)
                        .ThenBy(l => l.CreatedAt)
                        .Select(l => (int?)l.UserId)
                        .FirstOrDefault() ?? b.HighestBidderId,

                    HighestBidderName = _context.AuctionBidLogs
                        .Where(l => l.AuctionId == b.AuctionId && l.Phase == "Final")
                        .OrderByDescending(l => l.BidAmount)
                        .ThenBy(l => l.UserId == b.HighestBidderId)
                        .ThenBy(l => l.CreatedAt)
                        .Select(l => l.User != null ? l.User.LineName ?? l.User.UserId : "-")
                        .FirstOrDefault() ?? (b.HighestBidder != null ? b.HighestBidder.LineName ?? b.HighestBidder.UserId : "-"),

                    InitiatorName = b.Initiator != null ? b.Initiator.LineName ?? b.Initiator.UserId : "-",
                    NormalEndTime = b.NormalEndTime,
                    FinalEndTime = b.FinalEndTime,
                    DbStatus = b.DbStatus
                })
                .ToListAsync();

            return Ok(auctions);
        }

        [HttpPost("auctions/{auctionId}/cancel")]
        public async Task<IActionResult> CancelAuction(int auctionId)
        {
            try
            {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) return NotFound(new { message = "Auction not found" });

                if (auction.DbStatus != "Active" && auction.DbStatus != "Sold")
                {
                    return BadRequest(new { message = "Only active or sold auctions can be cancelled" });
                }

                if (auction.DbStatus == "Active")
                {
                    // 1. Process refunds for Active auctions
                    // Check if there are Final phase bids
                    var finalBids = await _context.AuctionBidLogs
                        .Where(l => l.AuctionId == auctionId && l.Phase == "Final")
                        .ToListAsync();

                    if (finalBids.Any())
                    {
                        // Refund all unique final bidders
                        var uniqueFinalBidders = finalBids
                            .GroupBy(b => b.UserId)
                            .Select(g => g.OrderByDescending(b => b.BidAmount).First())
                            .ToList();

                        foreach (var bid in uniqueFinalBidders)
                        {
                            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == bid.UserId);
                            if (wallet != null)
                            {
                                int refundAmount = bid.BidAmount;
                                wallet.AvailableBalance += refundAmount;
                                wallet.ReservedBalance -= refundAmount;

                                _context.AuctionTransactions.Add(new AuctionTransaction
                                {
                                    UserId = bid.UserId,
                                    Amount = refundAmount,
                                    Direction = "CREDIT",
                                    Type = "FINAL_BID_REFUND",
                                    Description = $"[Cancel] คืนเงินจากการยกเลิกประมูล {auction.Player?.PlayerName ?? ""}",
                                    BalanceAfter = wallet.AvailableBalance,
                                    RelatedAuctionId = auctionId,
                                    RelatedPlayerId = auction.PlayerId,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                    }
                    else if (auction.HighestBidderId.HasValue)
                    {
                        // Refund the Normal phase highest bidder
                        var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == auction.HighestBidderId.Value);
                        if (wallet != null)
                        {
                            wallet.AvailableBalance += auction.CurrentPrice;
                            wallet.ReservedBalance -= auction.CurrentPrice;

                            _context.AuctionTransactions.Add(new AuctionTransaction
                            {
                                UserId = auction.HighestBidderId.Value,
                                Amount = auction.CurrentPrice,
                                Direction = "CREDIT",
                                Type = "AUCTION_REFUND",
                                Description = $"[Cancel] คืนเงินจากการยกเลิกประมูล {auction.Player?.PlayerName ?? ""}",
                                BalanceAfter = wallet.AvailableBalance,
                                RelatedAuctionId = auctionId,
                                RelatedPlayerId = auction.PlayerId,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
                else if (auction.DbStatus == "Sold")
                {
                    // Process cancellation for Sold/Completed auctions
                    // Refund to the CURRENT OWNER in AuctionSquads if exists (in case player was transferred/sold on market), otherwise to HighestBidderId
                    var squadRecordsForRefund = await _context.AuctionSquads
                        .Where(s => s.PlayerId == auction.PlayerId)
                        .ToListAsync();

                    int refundUserId = squadRecordsForRefund.FirstOrDefault()?.UserId ?? auction.HighestBidderId ?? 0;
                    int refundAmount = squadRecordsForRefund.FirstOrDefault()?.PricePaid ?? auction.CurrentPrice;

                    if (refundUserId > 0)
                    {
                        var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == refundUserId);
                        if (wallet != null)
                        {
                            wallet.AvailableBalance += refundAmount;

                            _context.AuctionTransactions.Add(new AuctionTransaction
                            {
                                UserId = refundUserId,
                                Amount = refundAmount,
                                Direction = "CREDIT",
                                Type = "AUCTION_REFUND",
                                Description = $"[Cancel Sold] คืนเงินจากการยกเลิกประมูลสำเร็จ {auction.Player?.PlayerName ?? ""}",
                                BalanceAfter = wallet.AvailableBalance,
                                RelatedAuctionId = auctionId,
                                RelatedPlayerId = auction.PlayerId,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }

                // Always remove player from squad(s) if present (for both Active and Sold cancellations)
                var squadRecords = await _context.AuctionSquads
                    .Where(s => s.PlayerId == auction.PlayerId)
                    .ToListAsync();

                if (squadRecords.Any())
                {
                    var squadIds = squadRecords.Select(s => s.SquadId).ToList();
                    var relatedOffers = await _context.TransferOffers
                        .Where(o => squadIds.Contains(o.SquadId))
                        .ToListAsync();
                    if (relatedOffers.Any())
                    {
                        _context.TransferOffers.RemoveRange(relatedOffers);
                    }
                    _context.AuctionSquads.RemoveRange(squadRecords);
                }

                // 2. Set status to Cancelled
                auction.DbStatus = "Cancelled";
                await _context.SaveChangesAsync();

                // Broadcast to SignalR client
                await _hubContext.Clients.All.SendCoreAsync("AuctionUpdated", new object[] { auction });

                return Ok(new { message = "Auction cancelled and refunds processed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error cancelling auction: " + ex.Message });
            }
        }

        [HttpPost("auctions/{auctionId}/adjust-price")]
        public async Task<IActionResult> AdjustAuctionPrice(int auctionId, [FromBody] AdjustPriceRequest request)
        {
            try
            {
                var auction = await _context.AuctionBoards
                    .Include(b => b.Player)
                    .FirstOrDefaultAsync(b => b.AuctionId == auctionId);

                if (auction == null) return NotFound(new { message = "Auction not found" });

                if (auction.DbStatus != "Active" && auction.DbStatus != "Sold")
                {
                    return BadRequest(new { message = "Only active or sold auctions can be adjusted" });
                }

                // Determine current highest bidder and current price dynamically (checking Final phase first)
                int? highestBidderId = null;
                int oldPrice = auction.CurrentPrice;

                var finalBids = await _context.AuctionBidLogs
                    .Where(l => l.AuctionId == auctionId && l.Phase == "Final")
                    .OrderByDescending(l => l.BidAmount)
                    .ThenByDescending(l => l.UserId == auction.HighestBidderId)
                    .ThenBy(l => l.CreatedAt)
                    .ToListAsync();

                if (finalBids.Any())
                {
                    highestBidderId = finalBids.First().UserId;
                    oldPrice = finalBids.First().BidAmount;
                }
                else
                {
                    highestBidderId = auction.HighestBidderId;
                    oldPrice = auction.CurrentPrice;
                }

                int newPrice = request.NewPrice;

                if (newPrice <= 0)
                {
                    return BadRequest(new { message = "Price must be greater than 0" });
                }

                if (highestBidderId.HasValue)
                {
                    var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == highestBidderId.Value);
                    if (wallet != null)
                    {
                        int priceDiff = oldPrice - newPrice; // If newPrice is lower, diff is positive (refund). If higher, negative (deduct).

                        if (auction.DbStatus == "Sold")
                        {
                            // In a completed/sold auction, we only adjust AvailableBalance as ReservedBalance has already been cleared
                            wallet.AvailableBalance += priceDiff;

                            _context.AuctionTransactions.Add(new AuctionTransaction
                            {
                                UserId = highestBidderId.Value,
                                Amount = Math.Abs(priceDiff),
                                Direction = priceDiff >= 0 ? "CREDIT" : "DEBIT",
                                Type = "SPECIAL_BONUS",
                                Description = $"[Adjust Sold] ปรับราคาประมูล {auction.Player?.PlayerName ?? ""} จาก {oldPrice} เป็น {newPrice}",
                                BalanceAfter = wallet.AvailableBalance,
                                RelatedAuctionId = auctionId,
                                RelatedPlayerId = auction.PlayerId,
                                CreatedAt = DateTime.UtcNow
                            });

                            // Also adjust the squad record price
                            var squadRecord = await _context.AuctionSquads
                                .FirstOrDefaultAsync(s => s.PlayerId == auction.PlayerId && s.UserId == highestBidderId.Value);
                            if (squadRecord != null)
                            {
                                squadRecord.PricePaid = newPrice;
                            }
                        }
                        else
                        {
                            // Active auction
                            wallet.AvailableBalance += priceDiff;
                            wallet.ReservedBalance -= priceDiff;

                            _context.AuctionTransactions.Add(new AuctionTransaction
                            {
                                UserId = highestBidderId.Value,
                                Amount = Math.Abs(priceDiff),
                                Direction = priceDiff >= 0 ? "CREDIT" : "DEBIT",
                                Type = "SPECIAL_BONUS",
                                Description = $"[Adjust] ปรับราคาประมูล {auction.Player?.PlayerName ?? ""} จาก {oldPrice} เป็น {newPrice}",
                                BalanceAfter = wallet.AvailableBalance,
                                RelatedAuctionId = auctionId,
                                RelatedPlayerId = auction.PlayerId,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    if (finalBids.Any())
                    {
                        // Update their latest final bid log
                        var latestFinalBid = finalBids.First();
                        latestFinalBid.BidAmount = newPrice;
                    }
                    else
                    {
                        // Update their latest normal bid log
                        var latestBidLog = await _context.AuctionBidLogs
                            .Where(l => l.AuctionId == auctionId && l.UserId == highestBidderId.Value && l.Phase == "Normal")
                            .OrderByDescending(l => l.CreatedAt)
                            .FirstOrDefaultAsync();

                        if (latestBidLog != null)
                        {
                            latestBidLog.BidAmount = newPrice;
                        }
                    }
                }

                // Update the board's CurrentPrice (always for Sold, and also for Active if no final bids)
                if (auction.DbStatus == "Sold" || !finalBids.Any())
                {
                    auction.CurrentPrice = newPrice;
                }

                await _context.SaveChangesAsync();

                // Broadcast to SignalR client
                await _hubContext.Clients.All.SendCoreAsync("AuctionUpdated", new object[] { auction });

                return Ok(new { message = "Auction price adjusted successfully", newPrice = newPrice });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adjusting price: " + ex.Message });
            }
        }
    }

    public class SavePrizesRequest
    {
        public List<TbsPrizeSetting> Prizes { get; set; } = new();
        public string Password { get; set; } = string.Empty;
    }

    public class AdjustPriceRequest
    {
        public int NewPrice { get; set; }
    }
}

