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
        private readonly eTPL.API.Services.Interfaces.IDiscordService _discordService;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public DebugController(
            MsSqlDbContext db, 
            eTPL.API.Services.Interfaces.IDiscordService discordService,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _db = db;
            _discordService = discordService;
            _configuration = configuration;
        }

        [HttpGet("suarez")]
        public async Task<IActionResult> CheckSuarez()
        {
            var players = await _db.PesPlayerTeams
                .Where(p => p.PlayerName.ToLower().Contains("suar"))
                .ToListAsync();

            return Ok(players);
        }

        [HttpGet("test-discord-transfer")]
        public async Task<IActionResult> TestDiscordTransfer()
        {
            await _discordService.SendTransferAsync("Test Player", "สโมสรผู้ขาย (Seller)", "สโมสรผู้ซื้อ (Buyer)", 1234, isLoan: false, pesPlayerId: "40240");
            await _discordService.SendTransferAsync("Test Loan Player", "สโมสรผู้ให้ยืม (Lender)", "สโมสรผู้รับยืม (Borrower)", 500, isLoan: true, pesPlayerId: "40240");
            return Ok("Discord transfer/loan test messages sent!");
        }

        [HttpGet("test-discord-direct")]
        public async Task<IActionResult> TestDiscordDirect()
        {
            string webhookUrl = _configuration["Discord:WebhookUrl"] ?? string.Empty;
            if (string.IsNullOrEmpty(webhookUrl))
            {
                return BadRequest("Webhook URL is empty in configuration.");
            }

            var payload = new
            {
                embeds = new[]
                {
                    new
                    {
                        title = "TRANSFER UPDATE (DIRECT TEST)",
                        description = "**TRANSFER:** สโมสรผู้ซื้อ คว้าตัว Test Player จาก สโมสรผู้ขาย เรียบร้อย!\n\n👤 **ผู้ซื้อ:** สโมสรผู้ซื้อ\n👤 **ผู้ขาย:** สโมสรผู้ขาย\n⚽ **นักเตะ:** Test Player\n💰 **ค่าตัว:** 1,234 TP",
                        color = 0xE67E22,
                        timestamp = DateTime.UtcNow.ToString("o"),
                        image = new { url = "https://pesdb.net/assets/img/card/f40240.png" },
                        footer = new { text = "TPL FA" }
                    }
                }
            };

            using var httpClient = new System.Net.Http.HttpClient();
            var json = System.Text.Json.JsonSerializer.Serialize(payload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync(webhookUrl, content);
            string responseBody = await response.Content.ReadAsStringAsync();

            return Ok(new
            {
                StatusCode = (int)response.StatusCode,
                ReasonPhrase = response.ReasonPhrase,
                Body = responseBody,
                TargetWebhook = webhookUrl.Length > 20 ? webhookUrl.Substring(0, 15) + "..." : webhookUrl
            });
        }

        [HttpGet("test-discord-all")]
        public async Task<IActionResult> TestDiscordAll()
        {
            // 1. Match Result (Green)
            await _discordService.SendMatchResultAsync("แจ้งผลการแข่งขัน D1 : FC Barcelona 2 - 0 Real Madrid \n\nGoal by R. Lewandowski (2)");
            
            // 2. Auction Confirm (Light Red + Lewan)
            await _discordService.SendAuctionConfirmAsync("R. Lewandowski", "FC Barcelona (laporta_id)", 6500, "40240");
            
            // 3. Transfer (Orange + Lewan)
            await _discordService.SendTransferAsync("R. Lewandowski", "Bayern Munchen (kahn_id)", "FC Barcelona (laporta_id)", 7000, isLoan: false, pesPlayerId: "40240");
            
            // 4. Loan (Purple + Lewan)
            await _discordService.SendTransferAsync("R. Lewandowski", "FC Barcelona (laporta_id)", "Dortmund (watzke_id)", 1500, isLoan: true, pesPlayerId: "40240");
            
            // 5. Market Update (Yellow + Lewan)
            await _discordService.SendPlayerListedAsync("R. Lewandowski", "FC Barcelona (laporta_id)", 6000, "40240");
            
            // 6. News (Pink)
            await _discordService.SendNewsAnnouncementAsync("BREAKING NEWS: Lewandowski ย้ายซบบาร์ซ่าทางการ! แฟนบอลแห่ต้อนรับคับคั่ง");
            
            // 7. Season Events (Blue)
            await _discordService.SendSeasonEventAsync("PLAYER OF THE MONTH", "ยินดีกับ R. Lewandowski ที่คว้านักเตะยอดเยี่ยมประจำเดือน!");

            return Ok("All 7 Discord notification test cases sent successfully!");
        }
    }
}
