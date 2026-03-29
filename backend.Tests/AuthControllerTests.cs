using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using eTPL.API.Controllers;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Tests
{
    public class AuthControllerTests
    {
        private static LoginResponse MakeLoginResponse(string userId = "admin") => new()
        {
            Token = "jwt-token",
            User = new UserDto { UserId = userId, UserLevel = "admin" }
        };

        // ── Login ─────────────────────────────────────────────────────

        [Fact]
        public async Task Login_ValidCredentials_ReturnsOkWithToken()
        {
            // Arrange
            var mockService = new Mock<IAuthService>();
            mockService
                .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ReturnsAsync(MakeLoginResponse());

            var controller = new AuthController(mockService.Object);
            var request = new LoginRequest { UserId = "admin", Password = "pass" };

            // Act
            var actionResult = await controller.Login(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var response = Assert.IsType<ApiResponse<LoginResponse>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal("jwt-token", response.Data!.Token);
        }

        [Fact]
        public async Task Login_InvalidCredentials_ReturnsUnauthorized()
        {
            // Arrange
            var mockService = new Mock<IAuthService>();
            mockService
                .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ReturnsAsync((LoginResponse?)null);

            var controller = new AuthController(mockService.Object);

            // Act
            var actionResult = await controller.Login(new LoginRequest { UserId = "x", Password = "wrong" });

            // Assert
            var unauthorized = Assert.IsType<UnauthorizedObjectResult>(actionResult);
            var response = Assert.IsType<ApiResponse<string>>(unauthorized.Value);
            Assert.False(response.Success);
        }

        // ── LineLogin ─────────────────────────────────────────────────

        [Fact]
        public async Task LineLogin_ValidCode_ReturnsOkWithToken()
        {
            // Arrange
            var mockService = new Mock<IAuthService>();
            mockService
                .Setup(s => s.LineLoginAsync(It.IsAny<LineLoginRequest>()))
                .ReturnsAsync(MakeLoginResponse("lineuser"));

            var controller = new AuthController(mockService.Object);
            var request = new LineLoginRequest { Code = "authcode", RedirectUri = "https://example.com/cb" };

            // Act
            var actionResult = await controller.LineLogin(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var response = Assert.IsType<ApiResponse<LoginResponse>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal("lineuser", response.Data!.User.UserId);
        }

        [Fact]
        public async Task LineLogin_NoLinkedUser_ReturnsUnauthorized()
        {
            // Arrange
            var mockService = new Mock<IAuthService>();
            mockService
                .Setup(s => s.LineLoginAsync(It.IsAny<LineLoginRequest>()))
                .ReturnsAsync((LoginResponse?)null);

            var controller = new AuthController(mockService.Object);

            // Act
            var actionResult = await controller.LineLogin(new LineLoginRequest { Code = "bad", RedirectUri = "https://x.com/cb" });

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(actionResult);
        }
    }
}
