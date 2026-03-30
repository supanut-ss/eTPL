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
            try
            {
                var result = await _authService.LineLoginAsync(request);
                if (result == null)
                    return Unauthorized(ApiResponse<string>.Fail("ไม่พบบัญชีผู้ใช้ที่ผูกกับ LINE นี้"));

                return Ok(ApiResponse<LoginResponse>.Ok(result, "เข้าสู่ระบบด้วย LINE สำเร็จ"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpPost("line-auth")]
        public async Task<IActionResult> LineAuth([FromBody] LineLoginRequest request)
        {
            try
            {
                var result = await _authService.LineAuthAsync(request);
                if (result == null)
                    return BadRequest(ApiResponse<string>.Fail("ไม่สามารถยืนยันตัวตนผ่าน LINE ได้"));

                if (result.IsLinked)
                    return Ok(ApiResponse<LineAuthResponse>.Ok(result, "เข้าสู่ระบบด้วย LINE สำเร็จ"));

                return Ok(ApiResponse<LineAuthResponse>.Ok(result, "LINE account ยังไม่ถูกผูกกับผู้ใช้"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpGet("line-available-users")]
        public async Task<IActionResult> GetLineAvailableUsers()
        {
            var users = await _authService.GetLineAvailableUsersAsync();
            return Ok(ApiResponse<IEnumerable<LineAvailableUserDto>>.Ok(users, "ดึงรายชื่อผู้ใช้ที่ยังไม่ได้ผูก LINE สำเร็จ"));
        }

        [HttpPost("line-bind")]
        public async Task<IActionResult> LineBind([FromBody] LineBindRequest request)
        {
            var result = await _authService.BindLineAccountAsync(request);
            if (result == null)
                return BadRequest(ApiResponse<string>.Fail("ไม่สามารถผูกบัญชี LINE กับผู้ใช้ที่เลือกได้"));

            return Ok(ApiResponse<LoginResponse>.Ok(result, "ผูก LINE สำเร็จและเข้าสู่ระบบแล้ว"));
        }

        [HttpGet("line-login-url")]
        public IActionResult GetLineLoginUrl([FromQuery] string redirectUri, [FromQuery] string state)
        {
            try
            {
                var url = _authService.GetLineAuthorizeUrl(redirectUri, state);
                return Ok(ApiResponse<object>.Ok(new { url }, "สร้างลิงก์ LINE login สำเร็จ"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }
    }
}
