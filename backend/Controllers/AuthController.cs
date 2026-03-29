using Microsoft.AspNetCore.Mvc;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (result == null)
                return Unauthorized(ApiResponse<string>.Fail("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));

            return Ok(ApiResponse<LoginResponse>.Ok(result, "เข้าสู่ระบบสำเร็จ"));
        }
        [HttpPost("line-login")]
        public async Task<IActionResult> LineLogin([FromBody] LineLoginRequest request)
        {
            var result = await _authService.LineLoginAsync(request);
            if (result == null)
                return Unauthorized(ApiResponse<string>.Fail("ไม่พบบัญชีผู้ใช้ที่ผูกกับ LINE นี้"));

            return Ok(ApiResponse<LoginResponse>.Ok(result, "เข้าสู่ระบบด้วย LINE สำเร็จ"));
        }
    }
}
