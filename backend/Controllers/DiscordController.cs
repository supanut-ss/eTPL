using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eTPL.API.Services.Interfaces;
using eTPL.API.Models.DTOs;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class DiscordController : ControllerBase
    {
        private readonly IDiscordService _discordService;

        public DiscordController(IDiscordService discordService)
        {
            _discordService = discordService;
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestNotification([FromBody] DiscordTestRequest request)
        {
            await _discordService.SendCustomEmbedAsync(
                request.Title ?? "TEST NOTIFICATION",
                request.Message ?? "This is a test message from DiscordController",
                request.Color ?? 0x3498DB,
                request.ImageUrl
            );
            return Ok(ApiResponse<string>.Ok("Sent"));
        }

        [HttpPost("test-all")]
        public async Task<IActionResult> TestAll()
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

            return Ok(ApiResponse<string>.Ok("All Lewandowski test cases sent to Discord"));
        }

        [HttpPost("news")]
        public async Task<IActionResult> SendNews([FromBody] string message)
        {
            await _discordService.SendNewsAnnouncementAsync(message);
            return Ok(ApiResponse<string>.Ok("Sent"));
        }
    }

    public class DiscordTestRequest
    {
        public string? Title { get; set; }
        public string? Message { get; set; }
        public int? Color { get; set; }
        public string? ImageUrl { get; set; }
    }
}
