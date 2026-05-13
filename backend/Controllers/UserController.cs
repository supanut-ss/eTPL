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
        [AllowAnonymous]
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

        [HttpGet("{userId}/logo")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLogo(string userId)
        {
            var user = await _userService.GetByUserIdAsync(userId);
            string teamName = user?.CurrentTeam ?? "";
            
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "_image", "CLUB_LOGO");
            var filePath = Path.Combine(folderPath, $"{teamName}.png");

            if (!string.IsNullOrEmpty(teamName) && !System.IO.File.Exists(filePath))
            {
                // Try case-insensitive match
                var files = Directory.GetFiles(folderPath, "*.png");
                var matchedFile = files.FirstOrDefault(f => 
                    Path.GetFileNameWithoutExtension(f).Equals(teamName, StringComparison.OrdinalIgnoreCase));
                if (matchedFile != null) filePath = matchedFile;
            }

            if (!System.IO.File.Exists(filePath))
            {
                // Fallback to league logo if team logo not found
                filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logo-etpl.png");
            }

            if (!System.IO.File.Exists(filePath)) return NotFound();

            return PhysicalFile(filePath, "image/png");
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

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.Identity?.Name;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<string>.Fail("ไม่พบข้อมูลผู้ใช้"));

            var success = await _userService.ChangePasswordAsync(userId, request);
            if (!success)
                return BadRequest(ApiResponse<string>.Fail("รหัสผ่านปัจจุบันไม่ถูกต้อง"));

            return Ok(ApiResponse<string>.Ok("เปลี่ยนรหัสผ่านสำเร็จ"));
        }
    }
}
