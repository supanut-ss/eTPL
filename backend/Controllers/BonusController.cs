using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.Auction;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BonusController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly IConfiguration _config;

        public BonusController(MsSqlDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpGet]
        public async Task<IActionResult> GetBonuses()
        {
            var bonuses = await _context.SpecialBonuses
                .Include(b => b.User)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new {
                    b.Id,
                    b.UserId,
                    b.Amount,
                    b.Reason,
                    b.Status,
                    b.CreatedAt,
                    b.ApprovedAt,
                    b.ApprovedBy,
                    User = b.User == null ? null : new {
                        b.User.Id,
                        b.User.UserId,
                        b.User.LineName,
                        b.User.LinePic
                    }
                })
                .ToListAsync();
            return Ok(bonuses);
        }

        [HttpPost("request")]
        public async Task<IActionResult> RequestBonus([FromBody] SpecialBonus bonus)
        {
            bonus.Id = 0;
            bonus.Status = "Pending";
            bonus.CreatedAt = DateTime.Now;
            bonus.ApprovedAt = null;
            bonus.ApprovedBy = null;

            _context.SpecialBonuses.Add(bonus);
            await _context.SaveChangesAsync();

            return Ok(bonus);
        }

        [HttpPost("approve")]
        public async Task<IActionResult> ApproveBonus([FromBody] ApproveBonusRequest request)
        {
            var superAdminPassword = _config["AdminSettings:SuperAdminPassword"];
            if (request.Password != superAdminPassword)
            {
                return BadRequest(new { message = "Incorrect Super Admin Password" });
            }

            var bonus = await _context.SpecialBonuses.FindAsync(request.BonusId);
            if (bonus == null) return NotFound(new { message = "Bonus request not found" });

            if (bonus.Status != "Pending")
            {
                return BadRequest(new { message = "Bonus is already processed" });
            }

            // Update user wallet
            var wallet = await _context.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == bonus.UserId);
            if (wallet == null)
            {
                // Create wallet if doesn't exist (unlikely but safe)
                wallet = new AuctionUserWallet { UserId = bonus.UserId, AvailableBalance = 0 };
                _context.AuctionUserWallets.Add(wallet);
            }

            wallet.AvailableBalance += bonus.Amount;

            // Log transaction
            var transaction = new AuctionTransaction
            {
                UserId = bonus.UserId,
                Amount = bonus.Amount,
                Direction = "CREDIT",
                Type = "SPECIAL_BONUS",
                Description = $"Bonus Approved: {bonus.Reason}",
                CreatedAt = DateTime.UtcNow
            };
            _context.AuctionTransactions.Add(transaction);

            // Update bonus status
            bonus.Status = "Approved";
            bonus.ApprovedAt = DateTime.Now;
            bonus.ApprovedBy = "Super Admin"; // Or take from JWT if available

            await _context.SaveChangesAsync();

            return Ok(new { message = "Bonus approved and balance updated successfully" });
        }

        [HttpPost("reject")]
        public async Task<IActionResult> RejectBonus([FromBody] int bonusId)
        {
            var bonus = await _context.SpecialBonuses.FindAsync(bonusId);
            if (bonus == null) return NotFound();

            bonus.Status = "Rejected";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Bonus request rejected" });
        }
    }

    public class ApproveBonusRequest
    {
        public int BonusId { get; set; }
        public string Password { get; set; } = string.Empty;
    }
}
