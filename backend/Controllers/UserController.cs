using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize] // ต้อง login ทุก endpoint
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

        [HttpGet("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<UserDto>.Ok(user));
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            var user = await _userService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = user.Id },
                ApiResponse<UserDto>.Ok(user, "เพิ่มผู้ใช้สำเร็จ"));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _userService.UpdateAsync(id, request);
            if (user == null) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<UserDto>.Ok(user, "แก้ไขผู้ใช้สำเร็จ"));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _userService.DeleteAsync(id);
            if (!success) return NotFound(ApiResponse<string>.Fail("ไม่พบผู้ใช้"));
            return Ok(ApiResponse<string>.Ok("ลบสำเร็จ", "ลบผู้ใช้สำเร็จ"));
        }
    }
}
