using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Services;

namespace eTPL.API.Tests
{
    public class AuthServiceTests
    {
        private static MsSqlDbContext CreateInMemoryDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MsSqlDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new MsSqlDbContext(options);
        }

        private static IConfiguration BuildConfig()
        {
            var settings = new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "TestSecretKeyThatIsAtLeast32CharactersLong!",
                ["Jwt:Issuer"] = "eTPL",
                ["Jwt:Audience"] = "eTPL",
                ["Jwt:ExpireHours"] = "8",
                ["Line:ChannelId"] = "test-channel-id",
                ["Line:ChannelSecret"] = "test-channel-secret",
            };
            return new ConfigurationBuilder()
                .AddInMemoryCollection(settings)
                .Build();
        }

        // ── LoginAsync ────────────────────────────────────────────────

        [Fact]
        public async Task LoginAsync_ValidCredentials_ReturnsLoginResponse()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(LoginAsync_ValidCredentials_ReturnsLoginResponse));
            db.Users.Add(new User { UserId = "admin", Password = "pass123", UserLevel = "admin" });
            await db.SaveChangesAsync();

            var config = BuildConfig();
            var httpFactory = new Mock<IHttpClientFactory>();
            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LoginAsync(new LoginRequest { UserId = "admin", Password = "pass123" });

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.Token);
            Assert.Equal("admin", result.User.UserId);
            Assert.Equal("admin", result.User.UserLevel);
        }

        [Fact]
        public async Task LoginAsync_WrongPassword_ReturnsNull()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(LoginAsync_WrongPassword_ReturnsNull));
            db.Users.Add(new User { UserId = "admin", Password = "correct", UserLevel = "user" });
            await db.SaveChangesAsync();

            var config = BuildConfig();
            var httpFactory = new Mock<IHttpClientFactory>();
            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LoginAsync(new LoginRequest { UserId = "admin", Password = "wrong" });

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LoginAsync_UserNotFound_ReturnsNull()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(LoginAsync_UserNotFound_ReturnsNull));

            var config = BuildConfig();
            var httpFactory = new Mock<IHttpClientFactory>();
            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LoginAsync(new LoginRequest { UserId = "nobody", Password = "pass" });

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LoginAsync_ResponseContainsUserLineFields()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(LoginAsync_ResponseContainsUserLineFields));
            db.Users.Add(new User
            {
                UserId = "user1",
                Password = "p",
                UserLevel = "user",
                LineId = "Uabc123",
                LinePic = "https://example.com/pic.jpg",
                LineName = "Test User",
            });
            await db.SaveChangesAsync();

            var config = BuildConfig();
            var httpFactory = new Mock<IHttpClientFactory>();
            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LoginAsync(new LoginRequest { UserId = "user1", Password = "p" });

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Uabc123", result.User.LineId);
            Assert.Equal("https://example.com/pic.jpg", result.User.LinePic);
            Assert.Equal("Test User", result.User.LineName);
        }

        // ── LineLoginAsync ────────────────────────────────────────────

        [Fact]
        public async Task LineLoginAsync_LineApiTokenFails_ReturnsNull()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(LineLoginAsync_LineApiTokenFails_ReturnsNull));
            var config = BuildConfig();

            var handler = new TestHttpMessageHandler(req =>
                new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.BadRequest));

            var httpClient = new System.Net.Http.HttpClient(handler);
            var httpFactory = new Mock<IHttpClientFactory>();
            httpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LineLoginAsync(new LineLoginRequest
            {
                Code = "bad-code",
                RedirectUri = "https://example.com/callback"
            });

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LineLoginAsync_LineApiTokenOkButNoMatchingUser_ReturnsNull()
        {
            // Arrange — LINE APIs return success with a userId not in DB
            await using var db = CreateInMemoryDb(nameof(LineLoginAsync_LineApiTokenOkButNoMatchingUser_ReturnsNull));
            var config = BuildConfig();

            int callCount = 0;
            var handler = new TestHttpMessageHandler(req =>
            {
                callCount++;
                if (callCount == 1)
                {
                    // Token endpoint
                    var body = "{\"access_token\":\"at123\"}";
                    return new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.OK)
                    {
                        Content = new System.Net.Http.StringContent(body, System.Text.Encoding.UTF8, "application/json")
                    };
                }
                // Profile endpoint
                var profile = "{\"userId\":\"Unobody\",\"displayName\":\"Ghost\"}";
                return new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.OK)
                {
                    Content = new System.Net.Http.StringContent(profile, System.Text.Encoding.UTF8, "application/json")
                };
            });

            var httpClient = new System.Net.Http.HttpClient(handler);
            var httpFactory = new Mock<IHttpClientFactory>();
            httpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LineLoginAsync(new LineLoginRequest
            {
                Code = "code123",
                RedirectUri = "https://example.com/callback"
            });

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LineLoginAsync_ValidFlow_ReturnsLoginResponse()
        {
            // Arrange — LINE APIs return a userId that IS in DB
            await using var db = CreateInMemoryDb(nameof(LineLoginAsync_ValidFlow_ReturnsLoginResponse));
            db.Users.Add(new User
            {
                UserId = "user1",
                Password = "p",
                UserLevel = "user",
                LineId = "Uabc999",
                LineName = "Alice"
            });
            await db.SaveChangesAsync();

            var config = BuildConfig();
            int callCount = 0;
            var handler = new TestHttpMessageHandler(req =>
            {
                callCount++;
                if (callCount == 1)
                {
                    var body = "{\"access_token\":\"at999\"}";
                    return new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.OK)
                    {
                        Content = new System.Net.Http.StringContent(body, System.Text.Encoding.UTF8, "application/json")
                    };
                }
                var profile = "{\"userId\":\"Uabc999\",\"displayName\":\"Alice\"}";
                return new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.OK)
                {
                    Content = new System.Net.Http.StringContent(profile, System.Text.Encoding.UTF8, "application/json")
                };
            });

            var httpClient = new System.Net.Http.HttpClient(handler);
            var httpFactory = new Mock<IHttpClientFactory>();
            httpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

            var service = new AuthService(db, config, httpFactory.Object);

            // Act
            var result = await service.LineLoginAsync(new LineLoginRequest
            {
                Code = "code999",
                RedirectUri = "https://example.com/callback"
            });

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.Token);
            Assert.Equal("user1", result.User.UserId);
            Assert.Equal("Uabc999", result.User.LineId);
        }
    }

    /// <summary>
    /// Simple stub HttpMessageHandler that delegates to a provided factory function.
    /// </summary>
    internal sealed class TestHttpMessageHandler : System.Net.Http.HttpMessageHandler
    {
        private readonly Func<System.Net.Http.HttpRequestMessage, System.Net.Http.HttpResponseMessage> _handler;

        public TestHttpMessageHandler(Func<System.Net.Http.HttpRequestMessage, System.Net.Http.HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<System.Net.Http.HttpResponseMessage> SendAsync(
            System.Net.Http.HttpRequestMessage request,
            System.Threading.CancellationToken cancellationToken)
            => Task.FromResult(_handler(request));
    }
}
