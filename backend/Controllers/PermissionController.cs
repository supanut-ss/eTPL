using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/permissions")]
    [Authorize]
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _permissionService;

        public PermissionController(IPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        // GET api/permissions — ดึงสิทธิ์ทั้งหมด (admin only)
        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll()
        {
            var perms = await _permissionService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<PermissionDto>>.Ok(perms));
        }

        // GET api/permissions/my — ดึงเมนูที่ user ปัจจุบันเข้าได้
        [HttpGet("my")]
        public async Task<IActionResult> GetMyMenus()
        {
            var level = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "user";
            var menus = await _permissionService.GetAccessibleMenusAsync(level);
            return Ok(ApiResponse<IEnumerable<string>>.Ok(menus));
        }

        // PUT api/permissions — bulk update (admin only)
        [HttpPut]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> BulkUpdate([FromBody] BulkUpdatePermissionRequest request)
        {
            await _permissionService.BulkUpdateAsync(request);
            return Ok(ApiResponse<string>.Ok("อัปเดตสิทธิ์สำเร็จ"));
        }
    }
}
