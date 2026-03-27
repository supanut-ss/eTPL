using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<UserDto>>.Ok(users));
        }

        [HttpGet("{userId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetByUserId(string userId)
        {
            var user = await _userService.GetByUserIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<UserDto>.Ok(user));
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            var user = await _userService.CreateAsync(request);
            return CreatedAtAction(nameof(GetByUserId), new { userId = user.UserId },
                ApiResponse<UserDto>.Ok(user, "เพิ่มผู้ใช้สำเร็จ"));
        }

        [HttpPut("{userId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(string userId, [FromBody] UpdateUserRequest request)
        {
            var user = await _userService.UpdateByUserIdAsync(userId, request);
            if (user == null) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<UserDto>.Ok(user, "แก้ไขผู้ใช้สำเร็จ"));
        }

        [HttpDelete("{userId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(string userId)
        {
            var success = await _userService.DeleteByUserIdAsync(userId);
            if (!success) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<string>.Ok("ลบสำเร็จ", "ลบผู้ใช้สำเร็จ"));
        }
    }
}
