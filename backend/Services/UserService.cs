using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class UserService : IUserService
    {
        private readonly MsSqlDbContext _db;

        public UserService(MsSqlDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<UserDto>> GetAllAsync()
        {
            return await _db.Users
                .Select(u => ToDto(u))
                .ToListAsync();
        }

        public async Task<UserDto?> GetByIdAsync(int id)
        {
            // ไม่ใช้แล้ว — ใช้ GetByUserIdAsync แทน
            return null;
        }

        public async Task<UserDto?> GetByUserIdAsync(string userId)
        {
            var user = await _db.Users.FindAsync(userId);
            return user == null ? null : ToDto(user);
        }

        public async Task<UserDto> CreateAsync(CreateUserRequest request)
        {
            var user = new User
            {
                UserId = request.UserId,
                Password = request.Password,
                UserLevel = request.UserLevel,
                LineId = request.LineId,
                LinePic = request.LinePic,
                LineName = request.LineName,
                CurrentTeam = request.CurrentTeam,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return ToDto(user);
        }

        public async Task<UserDto?> UpdateAsync(int id, UpdateUserRequest request)
        {
            // ไม่ใช้ int id — ดู UpdateByUserIdAsync
            return null;
        }

        public async Task<UserDto?> UpdateByUserIdAsync(string userId, UpdateUserRequest request)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return null;

            user.UserLevel = request.UserLevel;
            user.LineId = request.LineId;
            user.LinePic = request.LinePic;
            user.LineName = request.LineName;
            user.CurrentTeam = request.CurrentTeam;

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.Password = request.Password;

            await _db.SaveChangesAsync();
            return ToDto(user);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            // ไม่ใช้ int id — ดู DeleteByUserIdAsync
            return false;
        }

        public async Task<bool> DeleteByUserIdAsync(string userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) return false;

            // Handle related data to prevent FK constraint violations
            // 1. Wallets
            var wallet = await _db.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == user.Id);
            if (wallet != null) _db.AuctionUserWallets.Remove(wallet);

            // 2. Squads (Release players back to free agency)
            var squads = await _db.AuctionSquads.Where(s => s.UserId == user.Id).ToListAsync();
            if (squads.Any()) _db.AuctionSquads.RemoveRange(squads);

            // 3. Transactions
            var trans = await _db.AuctionTransactions.Where(t => t.UserId == user.Id).ToListAsync();
            if (trans.Any()) _db.AuctionTransactions.RemoveRange(trans);

            // 4. Bid Logs
            var bids = await _db.AuctionBidLogs.Where(b => b.UserId == user.Id).ToListAsync();
            if (bids.Any()) _db.AuctionBidLogs.RemoveRange(bids);

            // 5. Special Bonuses
            var bonuses = await _db.SpecialBonuses.Where(b => b.UserId == user.Id).ToListAsync();
            if (bonuses.Any()) _db.SpecialBonuses.RemoveRange(bonuses);

            // 6. Daily Checkins
            var checkins = await _db.DailyCheckins.Where(c => c.UserId == user.UserId).ToListAsync();
            if (checkins.Any()) _db.DailyCheckins.RemoveRange(checkins);

            // 7. Transfer Offers
            var offers = await _db.TransferOffers.Where(o => o.FromUserId == user.Id || o.ToUserId == user.Id).ToListAsync();
            if (offers.Any()) _db.TransferOffers.RemoveRange(offers);

            // 8. Auction Boards
            // If the user initiated the auction, we might need to delete it or set initiator to someone else (e.g. system)
            var initiatedAuctions = await _db.AuctionBoards.Where(a => a.InitiatorUserId == user.Id).ToListAsync();
            if (initiatedAuctions.Any()) _db.AuctionBoards.RemoveRange(initiatedAuctions);

            // If the user is the highest bidder, we should probably set it back to null or the previous bidder
            // For simplicity, we'll set it to null and reduce current price back to start (or just let it be)
            var winningAuctions = await _db.AuctionBoards.Where(a => a.HighestBidderId == user.Id).ToListAsync();
            foreach (var wa in winningAuctions)
            {
                wa.HighestBidderId = null;
                // Price remains as it was, but no leader
            }

            // Finally delete the user
            _db.Users.Remove(user);
            
            try
            {
                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                // Log the error or handle it as needed
                // For now, we'll rethrow or return false if it's still blocked
                System.Diagnostics.Debug.WriteLine($"Delete User Error: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return false;

            // Verify current password
            if (user.Password != request.CurrentPassword)
                return false;

            // Update to new password
            user.Password = request.NewPassword;
            await _db.SaveChangesAsync();
            return true;
        }

        private static UserDto ToDto(User u) => new()
        {
            Id = u.Id,
            UserId = u.UserId,
            UserLevel = u.UserLevel,
            LineId = u.LineId,
            LinePic = u.LinePic,
            LineName = u.LineName,
            CurrentTeam = u.CurrentTeam,
        };
    }
}
