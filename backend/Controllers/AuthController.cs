using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IUserService _userService;

        public AuthController(IAuthService authService, IUserService userService)
        {
            _authService = authService;
            _userService = userService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (result == null)
                return Unauthorized(ApiResponse<string>.Fail("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));

            return Ok(ApiResponse<LoginResponse>.Ok(result, "เข้าสู่ระบบสำเร็จ"));
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<string>.Fail("ไม่พบข้อมูลผู้ใช้"));

            if (string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(ApiResponse<string>.Fail("กรุณากรอกรหัสผ่านใหม่"));

            if (request.NewPassword.Length < 8)
                return BadRequest(ApiResponse<string>.Fail("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"));

            var success = await _userService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
            if (!success)
                return BadRequest(ApiResponse<string>.Fail("รหัสผ่านปัจจุบันไม่ถูกต้อง"));

            return Ok(ApiResponse<string>.Ok("เปลี่ยนรหัสผ่านสำเร็จ"));
        }
    }
}
