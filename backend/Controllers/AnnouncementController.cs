using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/announcements")]
    [Authorize]
    public class AnnouncementController : ControllerBase
    {
        private const string ActivePlatform = "PC";
        private const string InactivePlatform = "HIDE";

        private readonly ScaffoldedDbContext _db;

        public AnnouncementController(ScaffoldedDbContext db)
        {
            _db = db;
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic()
        {
            var data = await _db.TbmAnnouces
                .AsNoTracking()
                .Where(a => a.Platform == ActivePlatform)
                .OrderByDescending(a => a.CreateDate)
                .Take(20)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Announcement = a.Announcement ?? string.Empty,
                    Announcer = a.Announcer ?? string.Empty,
                    CreateDate = a.CreateDate,
                    IsActive = a.Platform == ActivePlatform,
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<AnnouncementDto>>.Ok(data));
        }

        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.TbmAnnouces
                .AsNoTracking()
                .OrderByDescending(a => a.CreateDate)
                .Take(100)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Announcement = a.Announcement ?? string.Empty,
                    Announcer = a.Announcer ?? string.Empty,
                    CreateDate = a.CreateDate,
                    IsActive = a.Platform == ActivePlatform,
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<AnnouncementDto>>.Ok(data));
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementRequest request)
        {
            var text = request.Announcement?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return BadRequest(ApiResponse<string>.Fail("Announcement is required"));

            var currentUser = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var entity = new TbmAnnouce
            {
                Announcement = text,
                Announcer = string.IsNullOrWhiteSpace(request.Announcer)
                    ? currentUser
                    : request.Announcer!.Trim(),
                CreateDate = DateTime.Now,
                Platform = request.IsActive ? ActivePlatform : InactivePlatform,
            };

            _db.TbmAnnouces.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<AnnouncementDto>.Ok(new AnnouncementDto
            {
                Id = entity.Id,
                Announcement = entity.Announcement ?? string.Empty,
                Announcer = entity.Announcer ?? string.Empty,
                CreateDate = entity.CreateDate,
                IsActive = entity.Platform == ActivePlatform,
            }, "Announcement created"));
        }

        [HttpPut("{id:guid}")]
        [HttpPost("{id:guid}/update")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementRequest request)
        {
            var entity = await _db.TbmAnnouces.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Announcement not found"));

            var text = request.Announcement?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return BadRequest(ApiResponse<string>.Fail("Announcement is required"));

            entity.Announcement = text;
            entity.Announcer = string.IsNullOrWhiteSpace(request.Announcer)
                ? entity.Announcer
                : request.Announcer!.Trim();
            entity.Platform = request.IsActive ? ActivePlatform : InactivePlatform;

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<string>.Ok("Announcement updated"));
        }

        [HttpPatch("{id:guid}/toggle")]
        [HttpPost("{id:guid}/toggle")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Toggle(Guid id, [FromBody] ToggleAnnouncementRequest request)
        {
            var entity = await _db.TbmAnnouces.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Announcement not found"));

            entity.Platform = request.IsActive ? ActivePlatform : InactivePlatform;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok("Announcement status updated"));
        }

        [HttpDelete("{id:guid}")]
        [HttpPost("{id:guid}/delete")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.TbmAnnouces.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Announcement not found"));

            _db.TbmAnnouces.Remove(entity);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok("Announcement deleted"));
        }
    }
}
