
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using System.Linq;

// This is a scratch script to check user relations
public class RelationChecker {
    private readonly MsSqlDbContext _db;
    public RelationChecker(MsSqlDbContext db) { _db = db; }

    public async Task CheckUser(string userId) {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null) {
            Console.WriteLine("User not found");
            return;
        }
        Console.WriteLine($"Checking User: {user.UserId} (ID: {user.Id})");
        
        var wallet = await _db.AuctionUserWallets.CountAsync(x => x.UserId == user.Id);
        var squads = await _db.AuctionSquads.CountAsync(x => x.UserId == user.Id);
        var trans = await _db.AuctionTransactions.CountAsync(x => x.UserId == user.Id);
        var bids = await _db.AuctionBidLogs.CountAsync(x => x.UserId == user.Id);
        var bonuses = await _db.SpecialBonuses.CountAsync(x => x.UserId == user.Id);
        
        Console.WriteLine($"- Wallets: {wallet}");
        Console.WriteLine($"- Squads: {squads}");
        Console.WriteLine($"- Transactions: {trans}");
        Console.WriteLine($"- Bid Logs: {bids}");
        Console.WriteLine($"- Special Bonuses: {bonuses}");
    }
}
