using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;
using eTPL.API.Models.Scaffolded;

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
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            return user == null ? null : ToDto(user);
        }

        public async Task<UserDto> CreateAsync(CreateUserRequest request)
        {
            if (!string.IsNullOrWhiteSpace(request.CurrentTeam) && 
                request.CurrentTeam.Trim().ToLower() != "no team" && 
                request.CurrentTeam.Trim() != "—")
            {
                var teamExists = await _db.Users.AnyAsync(u => u.CurrentTeam == request.CurrentTeam);
                if (teamExists)
                {
                    throw new InvalidOperationException($"สโมสร {request.CurrentTeam} ถูกใช้งานโดยสมาชิกท่านอื่นแล้ว");
                }
            }

            var user = new User
            {
                UserId = request.UserId,
                Password = request.Password,
                UserLevel = request.UserLevel,
                LineId = request.LineId,
                LinePic = request.LinePic,
                LineName = request.LineName,
                CurrentTeam = request.CurrentTeam,
                TeamNickname = request.TeamNickname,
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
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) return null;

            if (!string.IsNullOrWhiteSpace(request.CurrentTeam) && 
                request.CurrentTeam.Trim().ToLower() != "no team" && 
                request.CurrentTeam.Trim() != "—")
            {
                var teamExists = await _db.Users.AnyAsync(u => u.CurrentTeam == request.CurrentTeam && u.UserId != userId);
                if (teamExists)
                {
                    throw new InvalidOperationException($"สโมสร {request.CurrentTeam} ถูกใช้งานโดยสมาชิกท่านอื่นแล้ว");
                }
            }

            user.UserLevel = request.UserLevel;
            user.LineId = request.LineId;
            user.LinePic = request.LinePic;
            user.LineName = request.LineName;
            user.CurrentTeam = request.CurrentTeam;
            user.TeamNickname = request.TeamNickname;

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
            // 1. Transfer Offers (Involving the user OR their squad)
            var userSquadIds = await _db.AuctionSquads.Where(s => s.UserId == user.Id).Select(s => s.SquadId).ToListAsync();
            var relatedOffers = await _db.TransferOffers
                .Where(o => o.FromUserId == user.Id || o.ToUserId == user.Id || userSquadIds.Contains(o.SquadId))
                .ToListAsync();
            if (relatedOffers.Any()) _db.TransferOffers.RemoveRange(relatedOffers);

            // 2. Wallets
            var wallet = await _db.AuctionUserWallets.FirstOrDefaultAsync(w => w.UserId == user.Id);
            if (wallet != null) _db.AuctionUserWallets.Remove(wallet);

            // 3. Transactions
            var trans = await _db.AuctionTransactions.Where(t => t.UserId == user.Id).ToListAsync();
            if (trans.Any()) _db.AuctionTransactions.RemoveRange(trans);

            // 4. Bid Logs & Auction Boards
            // 4a. If the user is the highest bidder, we must clear them first
            var winningAuctions = await _db.AuctionBoards.Where(a => a.HighestBidderId == user.Id).ToListAsync();
            foreach (var wa in winningAuctions)
            {
                wa.HighestBidderId = null;
            }

            // 4b. Clear user's own bid logs
            var userBids = await _db.AuctionBidLogs.Where(b => b.UserId == user.Id).ToListAsync();
            if (userBids.Any()) _db.AuctionBidLogs.RemoveRange(userBids);

            // 4c. Handle auctions initiated by the user
            var initiatedAuctions = await _db.AuctionBoards.Where(a => a.InitiatorUserId == user.Id).ToListAsync();
            if (initiatedAuctions.Any())
            {
                var auctionIds = initiatedAuctions.Select(a => a.AuctionId).ToList();
                // MUST clear ALL bid logs for these auctions before removing boards (due to Restrict FK)
                var logsOnInitiatedAuctions = await _db.AuctionBidLogs.Where(b => auctionIds.Contains(b.AuctionId)).ToListAsync();
                if (logsOnInitiatedAuctions.Any()) _db.AuctionBidLogs.RemoveRange(logsOnInitiatedAuctions);
                
                _db.AuctionBoards.RemoveRange(initiatedAuctions);
            }

            // 5. Squads (Now safe after clearing offers)
            var squads = await _db.AuctionSquads.Where(s => s.UserId == user.Id).ToListAsync();
            if (squads.Any()) _db.AuctionSquads.RemoveRange(squads);

            // 6. Special Bonuses
            var bonuses = await _db.SpecialBonuses.Where(b => b.UserId == user.Id).ToListAsync();
            if (bonuses.Any()) _db.SpecialBonuses.RemoveRange(bonuses);

            // 7. Daily Checkins (Using string UserId)
            var checkins = await _db.DailyCheckins.Where(c => c.UserId == user.UserId).ToListAsync();
            if (checkins.Any()) _db.DailyCheckins.RemoveRange(checkins);

            // 8. Legacy Teams (TbmTeam)
            var legacyTeams = await _db.TbmTeams.Where(t => t.UserId == user.Id).ToListAsync();
            if (legacyTeams.Any()) _db.TbmTeams.RemoveRange(legacyTeams);

            // 9. Cup Fixtures (Home or Away - Using string UserId)
            var cupFixtures = await _db.CupFixtures.Where(f => f.HomeUserId == user.UserId || f.AwayUserId == user.UserId).ToListAsync();
            if (cupFixtures.Any()) _db.CupFixtures.RemoveRange(cupFixtures);

            // 10. Notifications
            var notifications = await _db.Notifications.Where(n => n.UserId == user.Id).ToListAsync();
            if (notifications.Any()) _db.Notifications.RemoveRange(notifications);

            // Finally delete the user
            _db.Users.Remove(user);
            
            try
            {
                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Delete User Error: {ex.Message}");
                if (ex.InnerException != null)
                    System.Diagnostics.Debug.WriteLine($"Inner Error: {ex.InnerException.Message}");
                return false;
            }
        }

        public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
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
            TeamNickname = u.TeamNickname,
        };
    }
}
