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
            ("dashboard", "Dashboard"),
            ("users",     "จัดการผู้ใช้"),
            ("permissions", "จัดการสิทธิ์"),
        };

        public static readonly string[] AllLevels = { "admin", "user" };

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
            if (await _db.Permissions.AnyAsync()) return;

            // Seed default: admin เข้าถึงได้ทุกอย่าง, user เข้าได้แค่ dashboard
            var seeds = new List<Permission>();
            foreach (var (key, label) in AllMenus)
            {
                foreach (var level in AllLevels)
                {
                    seeds.Add(new Permission
                    {
                        MenuKey = key,
                        MenuLabel = label,
                        UserLevel = level,
                        CanAccess = level == "admin", // admin = true, user = false (ยกเว้น dashboard)
                    });
                }
            }
            // dashboard ทุก level เข้าได้
            seeds.Where(s => s.MenuKey == "dashboard").ToList().ForEach(s => s.CanAccess = true);

            _db.Permissions.AddRange(seeds);
            await _db.SaveChangesAsync();
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
