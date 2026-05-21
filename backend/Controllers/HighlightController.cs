using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/highlights")]
    [Authorize]
    public class HighlightController : ControllerBase
    {
        private const string ActivePlatform   = "YOUTUBE_ACTIVE";
        private const string InactivePlatform = "YOUTUBE_HIDE";

        private readonly MsSqlDbContext _db;

        public HighlightController(MsSqlDbContext db)
        {
            _db = db;
        }

        // ─── Public endpoint (no auth required) ─────────────────────────────
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
                    Id         = a.Id,
                    Announcement = a.Announcement ?? string.Empty,
                    Announcer  = a.Announcer ?? string.Empty,
                    CreateDate = a.CreateDate,
                    IsActive   = true,
                    ImageUrl   = a.ImageUrl,
                    IsSharedFacebook = a.IsSharedFacebook ?? false,
                    Type       = "YouTube"
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<AnnouncementDto>>.Ok(data));
        }

        // ─── Admin: list all (active + hidden) ──────────────────────────────
        [HttpGet]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.TbmAnnouces
                .AsNoTracking()
                .Where(a => a.Platform == ActivePlatform || a.Platform == InactivePlatform)
                .OrderByDescending(a => a.CreateDate)
                .Take(100)
                .Select(a => new AnnouncementDto
                {
                    Id         = a.Id,
                    Announcement = a.Announcement ?? string.Empty,
                    Announcer  = a.Announcer ?? string.Empty,
                    CreateDate = a.CreateDate,
                    IsActive   = a.Platform == ActivePlatform,
                    ImageUrl   = a.ImageUrl,
                    IsSharedFacebook = a.IsSharedFacebook ?? false,
                    Type       = "YouTube"
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<AnnouncementDto>>.Ok(data));
        }

        // ─── Admin: create ───────────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementRequest request)
        {
            var title = request.Announcement?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(ApiResponse<string>.Fail("Title is required"));

            var youtubeUrl = request.ImageUrl?.Trim();
            if (string.IsNullOrWhiteSpace(youtubeUrl))
                return BadRequest(ApiResponse<string>.Fail("YouTube URL is required"));

            var currentUser = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

            var entity = new TbmAnnouce
            {
                Announcement = title,
                Announcer    = string.IsNullOrWhiteSpace(request.Announcer)
                                   ? currentUser
                                   : request.Announcer!.Trim(),
                CreateDate   = DateTime.Now,
                Platform     = request.IsActive ? ActivePlatform : InactivePlatform,
                ImageUrl     = youtubeUrl,
            };

            _db.TbmAnnouces.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<AnnouncementDto>.Ok(new AnnouncementDto
            {
                Id           = entity.Id,
                Announcement = entity.Announcement ?? string.Empty,
                Announcer    = entity.Announcer ?? string.Empty,
                CreateDate   = entity.CreateDate,
                IsActive     = request.IsActive,
                ImageUrl     = entity.ImageUrl,
                Type         = "YouTube"
            }, "Highlight created"));
        }

        // ─── Admin: update ───────────────────────────────────────────────────
        [HttpPut("{id:guid}")]
        [HttpPost("{id:guid}/update")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementRequest request)
        {
            var entity = await _db.TbmAnnouces
                .FirstOrDefaultAsync(a => a.Id == id &&
                    (a.Platform == ActivePlatform || a.Platform == InactivePlatform));

            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Highlight not found"));

            var title = request.Announcement?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(ApiResponse<string>.Fail("Title is required"));

            entity.Announcement = title;
            entity.Announcer    = string.IsNullOrWhiteSpace(request.Announcer)
                                      ? entity.Announcer
                                      : request.Announcer!.Trim();
            entity.Platform     = request.IsActive ? ActivePlatform : InactivePlatform;
            entity.ImageUrl     = request.ImageUrl?.Trim();

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<string>.Ok("Highlight updated"));
        }

        // ─── Admin: toggle active ────────────────────────────────────────────
        [HttpPatch("{id:guid}/toggle")]
        [HttpPost("{id:guid}/toggle")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Toggle(Guid id, [FromBody] ToggleAnnouncementRequest request)
        {
            var entity = await _db.TbmAnnouces
                .FirstOrDefaultAsync(a => a.Id == id &&
                    (a.Platform == ActivePlatform || a.Platform == InactivePlatform));

            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Highlight not found"));

            entity.Platform = request.IsActive ? ActivePlatform : InactivePlatform;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok("Highlight status updated"));
        }

        // ─── Admin: delete ───────────────────────────────────────────────────
        [HttpDelete("{id:guid}")]
        [HttpPost("{id:guid}/delete")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.TbmAnnouces
                .FirstOrDefaultAsync(a => a.Id == id &&
                    (a.Platform == ActivePlatform || a.Platform == InactivePlatform));

            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Highlight not found"));

            _db.TbmAnnouces.Remove(entity);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok("Highlight deleted"));
        }
    }
}
