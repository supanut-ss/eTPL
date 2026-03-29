using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using eTPL.API.Controllers;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Tests
{
    public class UserControllerTests
    {
        private static UserDto MakeUserDto(string userId = "user1", string level = "user") =>
            new() { UserId = userId, UserLevel = level };

        private static UserController CreateController(IUserService service, string? identityName = null)
        {
            var controller = new UserController(service);

            if (identityName != null)
            {
                var claims = new[] { new Claim(ClaimTypes.Name, identityName) };
                var identity = new ClaimsIdentity(claims, "Test");
                var principal = new ClaimsPrincipal(identity);
                controller.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = principal }
                };
            }

            return controller;
        }

        // ── GetAll ────────────────────────────────────────────────────

        [Fact]
        public async Task GetAll_ReturnsOkWithUsers()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetAllAsync())
                .ReturnsAsync(new List<UserDto> { MakeUserDto("u1"), MakeUserDto("u2") });

            var controller = CreateController(mockService.Object);

            var result = await controller.GetAll();

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<IEnumerable<UserDto>>>(ok.Value);
            Assert.True(response.Success);
            Assert.Equal(2, response.Data!.Count());
        }

        // ── GetByUserId ───────────────────────────────────────────────

        [Fact]
        public async Task GetByUserId_ExistingUser_ReturnsOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByUserIdAsync("alice"))
                .ReturnsAsync(MakeUserDto("alice"));

            var controller = CreateController(mockService.Object);

            var result = await controller.GetByUserId("alice");

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<UserDto>>(ok.Value);
            Assert.Equal("alice", response.Data!.UserId);
        }

        [Fact]
        public async Task GetByUserId_UnknownUser_ReturnsNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.GetByUserIdAsync("ghost"))
                .ReturnsAsync((UserDto?)null);

            var controller = CreateController(mockService.Object);

            var result = await controller.GetByUserId("ghost");

            Assert.IsType<NotFoundObjectResult>(result);
        }

        // ── Create ────────────────────────────────────────────────────

        [Fact]
        public async Task Create_ValidRequest_ReturnsCreated()
        {
            var mockService = new Mock<IUserService>();
            var created = MakeUserDto("bob");
            mockService.Setup(s => s.CreateAsync(It.IsAny<CreateUserRequest>()))
                .ReturnsAsync(created);

            var controller = CreateController(mockService.Object);

            var result = await controller.Create(new CreateUserRequest { UserId = "bob", Password = "p", UserLevel = "user" });

            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var response = Assert.IsType<ApiResponse<UserDto>>(createdResult.Value);
            Assert.True(response.Success);
            Assert.Equal("bob", response.Data!.UserId);
        }

        // ── Update ────────────────────────────────────────────────────

        [Fact]
        public async Task Update_ExistingUser_ReturnsOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.UpdateByUserIdAsync("carol", It.IsAny<UpdateUserRequest>()))
                .ReturnsAsync(MakeUserDto("carol", "admin"));

            var controller = CreateController(mockService.Object);

            var result = await controller.Update("carol", new UpdateUserRequest { UserLevel = "admin" });

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<UserDto>>(ok.Value);
            Assert.Equal("admin", response.Data!.UserLevel);
        }

        [Fact]
        public async Task Update_UnknownUser_ReturnsNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.UpdateByUserIdAsync("ghost", It.IsAny<UpdateUserRequest>()))
                .ReturnsAsync((UserDto?)null);

            var controller = CreateController(mockService.Object);

            var result = await controller.Update("ghost", new UpdateUserRequest { UserLevel = "user" });

            Assert.IsType<NotFoundObjectResult>(result);
        }

        // ── Delete ────────────────────────────────────────────────────

        [Fact]
        public async Task Delete_ExistingUser_ReturnsOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.DeleteByUserIdAsync("dave"))
                .ReturnsAsync(true);

            var controller = CreateController(mockService.Object);

            var result = await controller.Delete("dave");

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(response.Success);
        }

        [Fact]
        public async Task Delete_UnknownUser_ReturnsNotFound()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.DeleteByUserIdAsync("ghost"))
                .ReturnsAsync(false);

            var controller = CreateController(mockService.Object);

            var result = await controller.Delete("ghost");

            Assert.IsType<NotFoundObjectResult>(result);
        }

        // ── ChangePassword ────────────────────────────────────────────

        [Fact]
        public async Task ChangePassword_CorrectPassword_ReturnsOk()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ChangePasswordAsync("eve", It.IsAny<ChangePasswordRequest>()))
                .ReturnsAsync(true);

            var controller = CreateController(mockService.Object, identityName: "eve");

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                CurrentPassword = "old",
                NewPassword = "new"
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(response.Success);
        }

        [Fact]
        public async Task ChangePassword_WrongPassword_ReturnsBadRequest()
        {
            var mockService = new Mock<IUserService>();
            mockService.Setup(s => s.ChangePasswordAsync("frank", It.IsAny<ChangePasswordRequest>()))
                .ReturnsAsync(false);

            var controller = CreateController(mockService.Object, identityName: "frank");

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                CurrentPassword = "wrong",
                NewPassword = "new"
            });

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task ChangePassword_NoIdentity_ReturnsUnauthorized()
        {
            var mockService = new Mock<IUserService>();
            // No identity set — User.Identity.Name will be null
            var controller = new UserController(mockService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                CurrentPassword = "x",
                NewPassword = "y"
            });

            Assert.IsType<UnauthorizedObjectResult>(result);
        }
    }
}
