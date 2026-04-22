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
        [AllowAnonymous]
        public async Task<IActionResult> SearchPlayers(
            [FromQuery] string searchTerm = "", 
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20, 
            [FromQuery] bool freeAgentOnly = false, 
            [FromQuery] string? grade = null,
            [FromQuery] string? league = null,
            [FromQuery] string? teamName = null,
            [FromQuery] string? position = null,
            [FromQuery] string? playingStyle = null,
            [FromQuery] string? foot = null,
            [FromQuery] string? nationality = null,
            [FromQuery] int? minHeight = null,
            [FromQuery] int? maxHeight = null,
            [FromQuery] int? minWeight = null,
            [FromQuery] int? maxWeight = null,
            [FromQuery] int? minAge = null,
            [FromQuery] int? maxAge = null,
            [FromQuery] bool ownedOnly = false)
        {
            try
            {
                // Correctly get integer userId using the existing helper
                int? userId = null;
                try {
                    userId = await GetCurrentUserIdAsync();
                } catch { /* Ignore if unauthenticated if ever allowed Anonymous */ }
                
                var result = await _auctionService.SearchPlayersAsync(
                    searchTerm, page, pageSize, freeAgentOnly, grade, 
                    league, teamName, position, playingStyle, foot, nationality, 
                    minHeight, maxHeight, minWeight, maxWeight, minAge, maxAge, ownedOnly, userId);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.ToString()));
            }
        }

        [HttpGet("filter-options")]
        public async Task<IActionResult> GetFilterOptions([FromQuery] string? league = null)
        {
            try
            {
                var result = await _auctionService.GetPlayerFilterOptionsAsync(league);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("board")]
        [AllowAnonymous] // Allow viewing board without login, though bidding requires auth
        public async Task<IActionResult> GetAuctionBoard()
        {
            try
            {
                int? userId = null;
                if (User.Identity?.IsAuthenticated == true)
                {
                    var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (!string.IsNullOrEmpty(userStrId))
                    {
                        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
                        if (user != null) userId = user.Id;
                    }
                }
                
                var result = await _auctionService.GetActiveAuctionsAsync(userId);
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

        [HttpGet("completed")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCompletedAuctions()
        {
            try
            {
                var result = await _auctionService.GetCompletedAuctionsAsync();
                return Ok(ApiResponse<object>.Ok(result));
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

        [HttpGet("my-squad")]
        public async Task<IActionResult> GetMySquad()
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.GetMySquadAsync(userId);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("wallet")]
        public async Task<IActionResult> GetWallet()
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.GetWalletAsync(userId);
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
                // Ensure columns exist (Manual migration check)
                try {
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbs_auction_settings') AND name = 'NormalBidDurationMinutes') ALTER TABLE tbs_auction_settings ADD NormalBidDurationMinutes INT NOT NULL DEFAULT 1200;");
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbs_auction_settings') AND name = 'FinalBidDurationMinutes') ALTER TABLE tbs_auction_settings ADD FinalBidDurationMinutes INT NOT NULL DEFAULT 1440;");
                } catch { /* Silent */ }

                var settings = await _db.AuctionSettings.FirstOrDefaultAsync();
                return Ok(ApiResponse<object>.Ok(settings!));
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

                // Ensure columns exist (Manual migration check) - MUST BE BEFORE ANY EF QUERY TO THIS TABLE
                try {
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbs_auction_settings') AND name = 'NormalBidDurationMinutes') ALTER TABLE tbs_auction_settings ADD NormalBidDurationMinutes INT NOT NULL DEFAULT 1200;");
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbs_auction_settings') AND name = 'FinalBidDurationMinutes') ALTER TABLE tbs_auction_settings ADD FinalBidDurationMinutes INT NOT NULL DEFAULT 1440;");
                } catch { /* Silent */ }

                var settings = await _db.AuctionSettings.FirstOrDefaultAsync();
                if (settings == null) throw new Exception("Not found");

                bool seasonChanged = settings.CurrentSeason != updatedSettings.CurrentSeason;

                settings.StartingBudget = updatedSettings.StartingBudget;
                settings.MaxSquadSize = updatedSettings.MaxSquadSize;
                settings.MinBidPrice = updatedSettings.MinBidPrice;
                settings.AuctionStartDate = updatedSettings.AuctionStartDate;
                settings.AuctionEndDate = updatedSettings.AuctionEndDate;
                settings.CurrentSeason = updatedSettings.CurrentSeason;
                
                settings.DailyBidStartTime = updatedSettings.DailyBidStartTime;
                settings.DailyBidEndTime = updatedSettings.DailyBidEndTime;

                settings.NormalBidDurationMinutes = updatedSettings.NormalBidDurationMinutes;
                settings.FinalBidDurationMinutes = updatedSettings.FinalBidDurationMinutes;

                await _db.SaveChangesAsync();

                if (seasonChanged)
                {
                    await _auctionService.HandleSeasonChangeAsync(updatedSettings.CurrentSeason);
                }

                return Ok(ApiResponse<object>.Ok(new { message = "อัปเดตการตั้งค่าสำเร็จ", data = settings }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
        [HttpGet("quotas")]
        [AllowAnonymous] // Anyone can see the rules
        public async Task<IActionResult> GetQuotas()
        {
            try
            {
                // Ensure columns exist (Manual migration check)
                try {
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_grade_quota') AND name = 'RenewalPercent') ALTER TABLE tbs_auction_grade_quota ADD RenewalPercent INT NOT NULL DEFAULT 0;");
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_grade_quota') AND name = 'ReleasePercent') ALTER TABLE tbs_auction_grade_quota ADD ReleasePercent INT NOT NULL DEFAULT 0;");
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_grade_quota') AND name = 'MaxSeasonsPerTeam') ALTER TABLE tbs_auction_grade_quota ADD MaxSeasonsPerTeam INT NOT NULL DEFAULT 0;");
                } catch { /* Silent */ }

                var quotas = await _db.AuctionGradeQuotas.OrderBy(q => q.MinOVR).ToListAsync();
                return Ok(ApiResponse<object>.Ok(quotas));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("quotas")]
        public async Task<IActionResult> UpdateQuotas([FromBody] List<AuctionGradeQuota> updatedQuotas)
        {
            try
            {
                var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
                if (user == null || user.UserLevel != "admin") throw new UnauthorizedAccessException("สำหรับ Admin เท่านั้น");

                // Ensure columns exist
                try {
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_grade_quota') AND name = 'RenewalPercent') ALTER TABLE tbs_auction_grade_quota ADD RenewalPercent INT NOT NULL DEFAULT 0;");
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_grade_quota') AND name = 'ReleasePercent') ALTER TABLE tbs_auction_grade_quota ADD ReleasePercent INT NOT NULL DEFAULT 0;");
                    await _db.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_grade_quota') AND name = 'MaxSeasonsPerTeam') ALTER TABLE tbs_auction_grade_quota ADD MaxSeasonsPerTeam INT NOT NULL DEFAULT 0;");
                } catch { /* Silent */ }

                foreach (var q in updatedQuotas)
                {
                    var quota = await _db.AuctionGradeQuotas.FindAsync(q.GradeId);
                    if (quota != null)
                    {
                        quota.MinOVR = q.MinOVR;
                        quota.MaxOVR = q.MaxOVR;
                        quota.MaxAllowedPerUser = q.MaxAllowedPerUser;
                        quota.RenewalPercent = q.RenewalPercent;
                        quota.ReleasePercent = q.ReleasePercent;
                        quota.MaxSeasonsPerTeam = q.MaxSeasonsPerTeam;
                    }
                }

                await _db.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(new { message = "อัปเดตโควตาสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ─── Transaction History ──────────────────────────────────────────────────

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions(int page = 1, int pageSize = 20)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.GetTransactionsAsync(userId, page, pageSize);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("transactions/global")]
        [AllowAnonymous]
        public async Task<IActionResult> GetGlobalTransactions(int page = 1, int pageSize = 20)
        {
            try
            {
                var result = await _auctionService.GetGlobalTransactionsAsync(page, pageSize);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ─── Squad Lifecycle ──────────────────────────────────────────────────────

        [HttpPost("bonus")]
        public async Task<IActionResult> GiveBonus([FromBody] GiveBonusRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
                if (user == null || user.UserLevel != "admin") throw new UnauthorizedAccessException("สำหรับ Admin เท่านั้น");

                await _auctionService.GiveBonusAsync(userId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "มอบโบนัสสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("squad/release")]
        public async Task<IActionResult> ReleasePlayer([FromBody] ReleasePlayerRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _auctionService.ReleasePlayerAsync(userId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "ปล่อยนักเตะสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("squad/renew")]
        public async Task<IActionResult> RenewContract([FromBody] RenewContractRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _auctionService.RenewContractAsync(userId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "ต่อสัญญาสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("squad/loan")]
        public async Task<IActionResult> LoanPlayer([FromBody] LoanPlayerRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _auctionService.LoanPlayerAsync(userId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "ยืมตัวนักเตะสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("squad/transfer")]
        public async Task<IActionResult> TransferPlayer([FromBody] TransferOfferRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _auctionService.TransferPlayerAsync(userId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "โอนย้ายนักเตะสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ─── Transfer Market & Offers ─────────────────────────────────────────────

        [HttpPost("transfer/list")]
        public async Task<IActionResult> ListPlayer([FromBody] dynamic request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                int squadId = request.GetProperty("squadId").GetInt32();
                int price = request.GetProperty("listingPrice").GetInt32();
                await _auctionService.ListPlayerAsync(userId, squadId, price);
                return Ok(ApiResponse<object>.Ok(new { message = "ตั้งขายนักเตะสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("transfer/delist")]
        public async Task<IActionResult> DelistPlayer([FromBody] dynamic request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                int squadId = request.GetProperty("squadId").GetInt32();
                await _auctionService.DelistPlayerAsync(userId, squadId);
                return Ok(ApiResponse<object>.Ok(new { message = "ยกเลิกการตั้งขายสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("transfer/board")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTransferBoard()
        {
            try
            {
                var result = await _auctionService.GetTransferBoardAsync();
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("transfer/offers")]
        public async Task<IActionResult> SubmitOffer([FromBody] CreateOfferRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.SubmitOfferAsync(userId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "ยื่นข้อเสนอสำเร็จ", data = result }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("transfer/offers/{offerId}/respond")]
        public async Task<IActionResult> RespondOffer(int offerId, [FromBody] RespondOfferRequest request)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _auctionService.RespondOfferAsync(userId, offerId, request);
                return Ok(ApiResponse<object>.Ok(new { message = "จัดการข้อเสนอสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("transfer/offers/{offerId}/cancel")]
        public async Task<IActionResult> CancelOffer(int offerId)
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                await _auctionService.CancelOfferAsync(userId, offerId);
                return Ok(ApiResponse<object>.Ok(new { message = "ยกเลิกข้อเสนอสำเร็จ" }));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("transfer/offers/incoming")]
        public async Task<IActionResult> GetIncomingOffers()
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.GetIncomingOffersAsync(userId);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("transfer/offers/outgoing")]
        public async Task<IActionResult> GetOutgoingOffers()
        {
            try
            {
                var userId = await GetCurrentUserIdAsync();
                var result = await _auctionService.GetOutgoingOffersAsync(userId);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("clubs")]
        [AllowAnonymous]
        public async Task<IActionResult> GetClubs()
        {
            try
            {
                var result = await _auctionService.GetAllClubsAsync();
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("clubs/{userStrId}/squad")]
        [AllowAnonymous]
        public async Task<IActionResult> GetClubSquad(string userStrId)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
                if (user == null) return NotFound(ApiResponse<object>.Fail("ไม่พบทีมที่ระบุ"));

                var result = await _auctionService.GetUserSummaryAsync(user.Id);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("admin/fix-stuck-auctions")]
        [AllowAnonymous]
        public async Task<IActionResult> FixStuckAuctions()
        {
            try
            {
                var count = await _auctionService.FixStuckAuctionsAsync();
                return Ok(ApiResponse<object>.Ok(new { fixed_count = count }, $"แก้ไข {count} auction ที่ค้างอยู่เรียบร้อยแล้ว"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        public class ResetMarketRequest
        {
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("admin/reset-market")]
        public async Task<IActionResult> ResetMarket([FromBody] ResetMarketRequest req)
        {
            try
            {
                var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
                if (user == null || user.UserLevel != "admin") throw new UnauthorizedAccessException("สำหรับ Admin เท่านั้น");

                if (user.Password != req.Password) throw new UnauthorizedAccessException("รหัสผ่านสำหรับยืนยันการ Reset ไม่ถูกต้อง");

                await _auctionService.ResetMarketAsync();
                return Ok(ApiResponse<object>.Ok(new object(), "ล้างข้อมูลตลาดเทรดทั้งหมดเรียบร้อยแล้ว"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
