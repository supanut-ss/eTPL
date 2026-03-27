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
                Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
                UserLevel = request.UserLevel,
                LineId = request.LineId,
                LinePic = request.LinePic,
                LineName = request.LineName,
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

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);

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
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return false;

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            return true;
        }

        private static UserDto ToDto(User u) => new()
        {
            UserId = u.UserId,
            UserLevel = u.UserLevel,
            LineId = u.LineId,
            LinePic = u.LinePic,
            LineName = u.LineName,
        };
    }
}
