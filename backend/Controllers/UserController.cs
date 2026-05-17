using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
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
        [Authorize]
        public async Task<IActionResult> GetByUserId(string userId)
        {
            var currentUserId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userLevel = User.FindFirstValue("UserLevel") ?? ""; // Fallback check
            
            // Allow if it's the user themselves OR if it's an admin
            if (currentUserId != userId && !User.IsInRole("admin") && userLevel != "admin") 
            {
                return Forbid();
            }

            var user = await _userService.GetByUserIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<UserDto>.Ok(user));
        }

        [HttpGet("{userId}/logo")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLogo(string userId)
        {
            var user = await _userService.GetByUserIdAsync(userId);
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "_image", "CLUB_LOGO");
            
            string teamName = user?.CurrentTeam ?? "";
            string filePath = "";

            // Try 1: By CurrentTeam (Case-insensitive)
            if (!string.IsNullOrEmpty(teamName))
            {
                var files = Directory.Exists(folderPath) ? Directory.GetFiles(folderPath, "*.png") : Array.Empty<string>();
                var matchedFile = files.FirstOrDefault(f => 
                    Path.GetFileNameWithoutExtension(f).Equals(teamName, StringComparison.OrdinalIgnoreCase));
                if (matchedFile != null) filePath = matchedFile;
            }

            // Try 2: By UserId (Case-insensitive) if team logo not found
            if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
            {
                var files = Directory.Exists(folderPath) ? Directory.GetFiles(folderPath, "*.png") : Array.Empty<string>();
                var matchedFile = files.FirstOrDefault(f => 
                    Path.GetFileNameWithoutExtension(f).Equals(userId, StringComparison.OrdinalIgnoreCase));
                if (matchedFile != null) filePath = matchedFile;
            }

            // Try 3: Hard Fallback to generic logo
            if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
            {
                filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "logo-etpl.png");
            }

            if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath)) return NotFound();

            return PhysicalFile(filePath, "image/png");
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            try
            {
                var user = await _userService.CreateAsync(request);
                return CreatedAtAction(nameof(GetByUserId), new { userId = user.UserId },
                    ApiResponse<UserDto>.Ok(user, "เพิ่มผู้ใช้สำเร็จ"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpPut("{userId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(string userId, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var user = await _userService.UpdateByUserIdAsync(userId, request);
                if (user == null) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
                return Ok(ApiResponse<UserDto>.Ok(user, "แก้ไขผู้ใช้สำเร็จ"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpDelete("{userId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(string userId)
        {
            try
            {
                var success = await _userService.DeleteByUserIdAsync(userId);
                if (!success) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้ หรือไม่สามารถลบได้เนื่องจากมีข้อมูลผูกพัน"));
                return Ok(ApiResponse<string>.Ok("ลบสำเร็จ", "ลบผู้ใช้สำเร็จ"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.Fail("ลบไม่สำเร็จ: " + ex.Message));
            }
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
