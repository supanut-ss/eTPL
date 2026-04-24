using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;
using System.Security.Claims;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IUserService _userService;

        public NotificationController(INotificationService notificationService, IUserService userService)
        {
            _notificationService = notificationService;
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userIdStr = User.Identity?.Name;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

            var user = await _userService.GetByUserIdAsync(userIdStr);
            if (user == null) return NotFound();

            var notifications = await _notificationService.GetUserNotificationsAsync(user.Id);
            return Ok(ApiResponse<IEnumerable<NotificationDto>>.Ok(notifications));
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userIdStr = User.Identity?.Name;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

            var user = await _userService.GetByUserIdAsync(userIdStr);
            if (user == null) return NotFound();

            var count = await _notificationService.GetUnreadCountAsync(user.Id);
            return Ok(ApiResponse<int>.Ok(count));
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            await _notificationService.MarkAsReadAsync(id);
            return Ok(ApiResponse<string>.Ok("Marked as read"));
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userIdStr = User.Identity?.Name;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

            var user = await _userService.GetByUserIdAsync(userIdStr);
            if (user == null) return NotFound();

            await _notificationService.MarkAllAsReadAsync(user.Id);
            return Ok(ApiResponse<string>.Ok("All marked as read"));
        }
    }
}
