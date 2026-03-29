using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Services;

namespace eTPL.API.Tests
{
    public class UserServiceTests
    {
        private static MsSqlDbContext CreateInMemoryDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MsSqlDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new MsSqlDbContext(options);
        }

        // ── GetAllAsync ───────────────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_EmptyDb_ReturnsEmpty()
        {
            await using var db = CreateInMemoryDb(nameof(GetAllAsync_EmptyDb_ReturnsEmpty));
            var service = new UserService(db);

            var result = await service.GetAllAsync();

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetAllAsync_WithUsers_ReturnsAllDtos()
        {
            await using var db = CreateInMemoryDb(nameof(GetAllAsync_WithUsers_ReturnsAllDtos));
            db.Users.AddRange(
                new User { UserId = "u1", Password = "p", UserLevel = "user" },
                new User { UserId = "u2", Password = "p", UserLevel = "admin" }
            );
            await db.SaveChangesAsync();
            var service = new UserService(db);

            var result = (await service.GetAllAsync()).ToList();

            Assert.Equal(2, result.Count);
            Assert.Contains(result, u => u.UserId == "u1");
            Assert.Contains(result, u => u.UserId == "u2");
        }

        // ── GetByUserIdAsync ──────────────────────────────────────────

        [Fact]
        public async Task GetByUserIdAsync_ExistingUser_ReturnsDto()
        {
            await using var db = CreateInMemoryDb(nameof(GetByUserIdAsync_ExistingUser_ReturnsDto));
            db.Users.Add(new User { UserId = "alice", Password = "p", UserLevel = "user", LineName = "Alice" });
            await db.SaveChangesAsync();
            var service = new UserService(db);

            var result = await service.GetByUserIdAsync("alice");

            Assert.NotNull(result);
            Assert.Equal("alice", result.UserId);
            Assert.Equal("Alice", result.LineName);
        }

        [Fact]
        public async Task GetByUserIdAsync_UnknownUser_ReturnsNull()
        {
            await using var db = CreateInMemoryDb(nameof(GetByUserIdAsync_UnknownUser_ReturnsNull));
            var service = new UserService(db);

            var result = await service.GetByUserIdAsync("nobody");

            Assert.Null(result);
        }

        // ── CreateAsync ───────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ValidRequest_PersistsAndReturnsDto()
        {
            await using var db = CreateInMemoryDb(nameof(CreateAsync_ValidRequest_PersistsAndReturnsDto));
            var service = new UserService(db);

            var dto = await service.CreateAsync(new CreateUserRequest
            {
                UserId = "bob",
                Password = "secret",
                UserLevel = "user",
                LineId = "Ubob1",
                LinePic = "https://img.example.com/bob.jpg",
                LineName = "Bob"
            });

            Assert.Equal("bob", dto.UserId);
            Assert.Equal("user", dto.UserLevel);
            Assert.Equal("Ubob1", dto.LineId);

            // Also verify persisted in DB
            var persisted = await db.Users.FindAsync("bob");
            Assert.NotNull(persisted);
            Assert.Equal("secret", persisted.Password);
        }

        // ── UpdateByUserIdAsync ───────────────────────────────────────

        [Fact]
        public async Task UpdateByUserIdAsync_ExistingUser_UpdatesFields()
        {
            await using var db = CreateInMemoryDb(nameof(UpdateByUserIdAsync_ExistingUser_UpdatesFields));
            db.Users.Add(new User { UserId = "carol", Password = "old", UserLevel = "user" });
            await db.SaveChangesAsync();
            var service = new UserService(db);

            var dto = await service.UpdateByUserIdAsync("carol", new UpdateUserRequest
            {
                UserLevel = "admin",
                Password = "newpass",
                LineId = "Ucarol",
                LinePic = null,
                LineName = "Carol"
            });

            Assert.NotNull(dto);
            Assert.Equal("admin", dto.UserLevel);
            Assert.Equal("Ucarol", dto.LineId);
            Assert.Equal("Carol", dto.LineName);

            // Verify password was updated
            var persisted = await db.Users.FindAsync("carol");
            Assert.Equal("newpass", persisted!.Password);
        }

        [Fact]
        public async Task UpdateByUserIdAsync_EmptyPassword_DoesNotChangePassword()
        {
            await using var db = CreateInMemoryDb(nameof(UpdateByUserIdAsync_EmptyPassword_DoesNotChangePassword));
            db.Users.Add(new User { UserId = "dave", Password = "original", UserLevel = "user" });
            await db.SaveChangesAsync();
            var service = new UserService(db);

            await service.UpdateByUserIdAsync("dave", new UpdateUserRequest
            {
                UserLevel = "user",
                Password = "",   // empty → should NOT overwrite
            });

            var persisted = await db.Users.FindAsync("dave");
            Assert.Equal("original", persisted!.Password);
        }

        [Fact]
        public async Task UpdateByUserIdAsync_UnknownUser_ReturnsNull()
        {
            await using var db = CreateInMemoryDb(nameof(UpdateByUserIdAsync_UnknownUser_ReturnsNull));
            var service = new UserService(db);

            var result = await service.UpdateByUserIdAsync("ghost", new UpdateUserRequest { UserLevel = "user" });

            Assert.Null(result);
        }

        // ── DeleteByUserIdAsync ───────────────────────────────────────

        [Fact]
        public async Task DeleteByUserIdAsync_ExistingUser_DeletesAndReturnsTrue()
        {
            await using var db = CreateInMemoryDb(nameof(DeleteByUserIdAsync_ExistingUser_DeletesAndReturnsTrue));
            db.Users.Add(new User { UserId = "eve", Password = "p", UserLevel = "user" });
            await db.SaveChangesAsync();
            var service = new UserService(db);

            var success = await service.DeleteByUserIdAsync("eve");

            Assert.True(success);
            Assert.Null(await db.Users.FindAsync("eve"));
        }

        [Fact]
        public async Task DeleteByUserIdAsync_UnknownUser_ReturnsFalse()
        {
            await using var db = CreateInMemoryDb(nameof(DeleteByUserIdAsync_UnknownUser_ReturnsFalse));
            var service = new UserService(db);

            var success = await service.DeleteByUserIdAsync("nobody");

            Assert.False(success);
        }

        // ── ChangePasswordAsync ───────────────────────────────────────

        [Fact]
        public async Task ChangePasswordAsync_CorrectCurrentPassword_ChangesPasswordAndReturnsTrue()
        {
            await using var db = CreateInMemoryDb(nameof(ChangePasswordAsync_CorrectCurrentPassword_ChangesPasswordAndReturnsTrue));
            db.Users.Add(new User { UserId = "frank", Password = "oldpwd", UserLevel = "user" });
            await db.SaveChangesAsync();
            var service = new UserService(db);

            var success = await service.ChangePasswordAsync("frank", new ChangePasswordRequest
            {
                CurrentPassword = "oldpwd",
                NewPassword = "newpwd"
            });

            Assert.True(success);
            var persisted = await db.Users.FindAsync("frank");
            Assert.Equal("newpwd", persisted!.Password);
        }

        [Fact]
        public async Task ChangePasswordAsync_WrongCurrentPassword_ReturnsFalse()
        {
            await using var db = CreateInMemoryDb(nameof(ChangePasswordAsync_WrongCurrentPassword_ReturnsFalse));
            db.Users.Add(new User { UserId = "grace", Password = "correct", UserLevel = "user" });
            await db.SaveChangesAsync();
            var service = new UserService(db);

            var success = await service.ChangePasswordAsync("grace", new ChangePasswordRequest
            {
                CurrentPassword = "wrong",
                NewPassword = "newpwd"
            });

            Assert.False(success);
            var persisted = await db.Users.FindAsync("grace");
            Assert.Equal("correct", persisted!.Password);  // unchanged
        }

        [Fact]
        public async Task ChangePasswordAsync_UnknownUser_ReturnsFalse()
        {
            await using var db = CreateInMemoryDb(nameof(ChangePasswordAsync_UnknownUser_ReturnsFalse));
            var service = new UserService(db);

            var success = await service.ChangePasswordAsync("ghost", new ChangePasswordRequest
            {
                CurrentPassword = "any",
                NewPassword = "new"
            });

            Assert.False(success);
        }
    }
}
