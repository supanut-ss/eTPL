using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Hubs;
using eTPL.API.Models.Auction;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/auction")]
    [Authorize]
    public class AuctionController : ControllerBase
    {
        private readonly IAuctionService _auctionService;
        private readonly IHubContext<AuctionHub> _hubContext;
        private readonly MsSqlDbContext _db;

        public AuctionController(IAuctionService auctionService, IHubContext<AuctionHub> hubContext, MsSqlDbContext db)
        {
            _auctionService = auctionService;
            _hubContext = hubContext;
            _db = db;
        }

        private async Task<int> GetCurrentUserIdAsync()
        {
            var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userStrId)) throw new UnauthorizedAccessException("ไม่พบข้อมูลผู้ใช้");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
            if (user == null) throw new UnauthorizedAccessException("ไม่พบข้อมูลผู้ใช้ในระบบ");

            return user.Id;
        }

        [HttpGet("players")]
        public async Task<IActionResult> SearchPlayers([FromQuery] string searchTerm = "", [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _auctionService.SearchPlayersAsync(searchTerm, page, pageSize);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.ToString()));
            }
        }

        [HttpGet("board")]
        [AllowAnonymous] // Allow viewing board without login, though bidding requires auth
        public async Task<IActionResult> GetAuctionBoard()
        {
            try
            {
                var result = await _auctionService.GetActiveAuctionsAsync();
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("start/{playerId}")]
        public async Task<IActionResult> StartAuction(int playerId)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.StartAuctionAsync(playerId, userId);
                
                // Broadcast to SignalR connected clients
                await _hubContext.Clients.All.SendCoreAsync("AuctionStarted", new object[] { result });
                
                return Ok(ApiResponse<object>.Ok(new { message = "เปิดประมูลสำเร็จ", data = result }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{auctionId}/bid/normal")]
        public async Task<IActionResult> PlaceNormalBid(int auctionId, [FromBody] PlaceBidRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.PlaceNormalBidAsync(auctionId, userId, request.BidAmount);
                
                await _hubContext.Clients.All.SendCoreAsync("AuctionUpdated", new object[] { result });
                
                return Ok(ApiResponse<object>.Ok(new { message = "เสนอราคาสำเร็จ", data = result }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{auctionId}/bid/final")]
        public async Task<IActionResult> PlaceFinalBid(int auctionId, [FromBody] PlaceFinalBidRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.PlaceFinalBidAsync(auctionId, userId, request.BidAmount);
                
                // Final bids are secret, we may not need to broadcast details,
                // but we can broadcast that a final bid was placed or state updated
                await _hubContext.Clients.All.SendCoreAsync("AuctionUpdated", new object[] { result });
                
                return Ok(ApiResponse<object>.Ok(new { message = "เสนอราคาปิดผนึกสำเร็จ", data = result }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{auctionId}/confirm")]
        public async Task<IActionResult> ConfirmAuction(int auctionId)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.ConfirmAuctionAsync(auctionId, userId);
                
                await _hubContext.Clients.All.SendCoreAsync("AuctionUpdated", new object[] { result });
                
                return Ok(ApiResponse<object>.Ok(new { message = "ยืนยันประมูลสำเร็จ", data = result }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetUserSummary()
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.GetUserSummaryAsync(userId);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            try
            {
                var settings = await _db.AuctionSettings.FirstOrDefaultAsync();
                return Ok(ApiResponse<object>.Ok(settings));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] AuctionSetting updatedSettings)
        {
            try
            {
                var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
                if (user == null || user.UserLevel != "admin") throw new UnauthorizedAccessException("สำหรับ Admin เท่านั้น");

                var settings = await _db.AuctionSettings.FirstOrDefaultAsync();
                if (settings == null) throw new Exception("Not found");

                settings.StartingBudget = updatedSettings.StartingBudget;
                settings.MaxSquadSize = updatedSettings.MaxSquadSize;
                settings.MinBidPrice = updatedSettings.MinBidPrice;
                settings.AuctionStartDate = updatedSettings.AuctionStartDate;
                settings.AuctionEndDate = updatedSettings.AuctionEndDate;
                
                settings.DailyBidStartTime = updatedSettings.DailyBidStartTime;
                settings.DailyBidEndTime = updatedSettings.DailyBidEndTime;

                await _db.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(new { message = "อัปเดตการตั้งค่าสำเร็จ", data = settings }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
