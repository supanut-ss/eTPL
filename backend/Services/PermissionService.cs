using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly MsSqlDbContext _db;

        // รายการ menus ทั้งหมดในระบบ (single source of truth)
        public static readonly List<(string Key, string Label)> AllMenus = new()
        {
            ("fixtures",       "My Fixtures"),
            ("my-squad",       "My Team"),
            ("clubs-squad",    "League Teams"),
            ("auction",        "Auction Market"),
            ("transfer-board", "Transfer Market"),
            ("deal-center",    "Transfer Center"),
            ("users",          "Manage Users"),
            ("permissions",    "Permissions"),
            ("admin-auction",  "Auction Settings"),
            ("admin-manage-data", "Data Management"),
            ("admin-league-setting", "League Setting"),
            ("announcements",  "Announcements"),

        };

        public static readonly string[] AllLevels = { "admin", "moderator", "user" };

        public PermissionService(MsSqlDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<PermissionDto>> GetAllAsync()
        {
            // Seed ถ้ายังไม่มีข้อมูล
            await EnsureSeedAsync();

            var perms = await _db.Permissions.ToListAsync();
            return perms.Select(ToDto);
        }

        public async Task BulkUpdateAsync(BulkUpdatePermissionRequest request)
        {
            foreach (var item in request.Permissions)
            {
                var existing = await _db.Permissions
                    .FirstOrDefaultAsync(p => p.MenuKey == item.MenuKey && p.UserLevel == item.UserLevel);

                if (existing != null)
                {
                    existing.CanAccess = item.CanAccess;
                }
                else
                {
                    var menu = AllMenus.FirstOrDefault(m => m.Key == item.MenuKey);
                    _db.Permissions.Add(new Permission
                    {
                        MenuKey = item.MenuKey,
                        MenuLabel = menu.Label ?? item.MenuKey,
                        UserLevel = item.UserLevel,
                        CanAccess = item.CanAccess,
                    });
                }
            }
            await _db.SaveChangesAsync();
        }

        public async Task<IEnumerable<string>> GetAccessibleMenusAsync(string userLevel)
        {
            await EnsureSeedAsync();
            return await _db.Permissions
                .Where(p => p.UserLevel == userLevel && p.CanAccess)
                .Select(p => p.MenuKey)
                .ToListAsync();
        }

        private async Task EnsureSeedAsync()
        {
            // Seed any menu/level combination that doesn't exist yet (handles new menus added to AllMenus)
            var existing = await _db.Permissions
                .Select(p => new { p.MenuKey, p.UserLevel })
                .ToListAsync();

            var existingSet = existing
                .Select(p => $"{p.MenuKey}|{p.UserLevel}")
                .ToHashSet();

            var seeds = new List<Permission>();
            foreach (var (key, label) in AllMenus)
            {
                foreach (var level in AllLevels)
                {
                    if (existingSet.Contains($"{key}|{level}")) continue;

                    // Default: admin can access everything; user starts with nothing (permissions are managed)
                    var canAccess = level == "admin";
                    seeds.Add(new Permission
                    {
                        MenuKey = key,
                        MenuLabel = label,
                        UserLevel = level,
                        CanAccess = canAccess,
                    });
                }
            }

            if (seeds.Count > 0)
            {
                _db.Permissions.AddRange(seeds);
                await _db.SaveChangesAsync();
            }
        }

        private static PermissionDto ToDto(Permission p) => new()
        {
            MenuKey = p.MenuKey,
            MenuLabel = p.MenuLabel,
            UserLevel = p.UserLevel,
            CanAccess = p.CanAccess,
        };
    }
}
