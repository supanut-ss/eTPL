using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/announcements")]
    [Authorize]
    public class AnnouncementController : ControllerBase
    {
        private const string ActivePlatform = "PC"; // News
        private const string InactivePlatform = "HIDE";
        private const string ActiveEvent = "EVENT_ACTIVE";
        private const string InactiveEvent = "EVENT_HIDE";
        private const string ActiveMagazine = "MAGAZINE_ACTIVE";
        private const string InactiveMagazine = "MAGAZINE_HIDE";

        private readonly ScaffoldedDbContext _db;
        private readonly IDiscordService _discordService;

        public AnnouncementController(ScaffoldedDbContext db, IDiscordService discordService)
        {
            _db = db;
            _discordService = discordService;
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic([FromQuery] string type = "News")
        {
            var activePlatform = type == "Magazine" ? ActiveMagazine
                               : type == "Event"    ? ActiveEvent
                               : ActivePlatform; // News / default

            var data = await _db.TbmAnnouces
                .AsNoTracking()
                .Where(a => a.Platform == activePlatform)
                .OrderByDescending(a => a.CreateDate)
                .Take(20)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Announcement = a.Announcement ?? string.Empty,
                    Announcer = a.Announcer ?? string.Empty,
                    CreateDate = a.CreateDate,
                    IsActive = true,
                    ImageUrl = a.ImageUrl,
                    Type = type
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<AnnouncementDto>>.Ok(data));
        }

        [HttpGet]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> GetAll([FromQuery] string type = "News")
        {
            var activePlat   = type == "Magazine" ? ActiveMagazine   : type == "Event" ? ActiveEvent   : ActivePlatform;
            var inactivePlat = type == "Magazine" ? InactiveMagazine : type == "Event" ? InactiveEvent : InactivePlatform;

            var data = await _db.TbmAnnouces
                .AsNoTracking()
                .Where(a => a.Platform == activePlat || a.Platform == inactivePlat)
                .OrderByDescending(a => a.CreateDate)
                .Take(100)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Announcement = a.Announcement ?? string.Empty,
                    Announcer = a.Announcer ?? string.Empty,
                    CreateDate = a.CreateDate,
                    IsActive = a.Platform == activePlat,
                    ImageUrl = a.ImageUrl,
                    Type = type
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<AnnouncementDto>>.Ok(data));
        }

        [HttpPost]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementRequest request)
        {
            var text = request.Announcement?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return BadRequest(ApiResponse<string>.Fail("Announcement is required"));

            var currentUser = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var activePlat = request.Type == "Magazine" ? ActiveMagazine : (request.Type == "Event" ? ActiveEvent : ActivePlatform);
            var inactivePlat = request.Type == "Magazine" ? InactiveMagazine : (request.Type == "Event" ? InactiveEvent : InactivePlatform);

            var entity = new TbmAnnouce
            {
                Announcement = text,
                Announcer = string.IsNullOrWhiteSpace(request.Announcer)
                    ? currentUser
                    : request.Announcer!.Trim(),
                CreateDate = DateTime.Now,
                Platform = request.IsActive ? activePlat : inactivePlat,
                ImageUrl = request.ImageUrl,
            };

            _db.TbmAnnouces.Add(entity);
            await _db.SaveChangesAsync();

            // SEND DISCORD NOTIFICATION
            if (request.IsActive)
            {
                _ = _discordService.SendNewsAnnouncementAsync(text);
            }

            return Ok(ApiResponse<AnnouncementDto>.Ok(new AnnouncementDto
            {
                Id = entity.Id,
                Announcement = entity.Announcement ?? string.Empty,
                Announcer = entity.Announcer ?? string.Empty,
                CreateDate = entity.CreateDate,
                IsActive = request.IsActive,
                ImageUrl = entity.ImageUrl,
                Type = request.Type
            }, "Announcement created"));
        }

        [HttpPut("{id:guid}")]
        [HttpPost("{id:guid}/update")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementRequest request)
        {
            var entity = await _db.TbmAnnouces.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Announcement not found"));

            var text = request.Announcement?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return BadRequest(ApiResponse<string>.Fail("Announcement is required"));

            var activePlat = request.Type == "Magazine" ? ActiveMagazine : (request.Type == "Event" ? ActiveEvent : ActivePlatform);
            var inactivePlat = request.Type == "Magazine" ? InactiveMagazine : (request.Type == "Event" ? InactiveEvent : InactivePlatform);

            entity.Announcement = text;
            entity.Announcer = string.IsNullOrWhiteSpace(request.Announcer)
                ? entity.Announcer
                : request.Announcer!.Trim();
            entity.Platform = request.IsActive ? activePlat : inactivePlat;
            entity.ImageUrl = request.ImageUrl;

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<string>.Ok("Announcement updated"));
        }

        [HttpPatch("{id:guid}/toggle")]
        [HttpPost("{id:guid}/toggle")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Toggle(Guid id, [FromBody] ToggleAnnouncementRequest request)
        {
            var entity = await _db.TbmAnnouces.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Announcement not found"));

            bool isMagazine = entity.Platform == ActiveMagazine || entity.Platform == InactiveMagazine;
            bool isEvent = entity.Platform == ActiveEvent || entity.Platform == InactiveEvent;
            
            var activePlat = isMagazine ? ActiveMagazine : (isEvent ? ActiveEvent : ActivePlatform);
            var inactivePlat = isMagazine ? InactiveMagazine : (isEvent ? InactiveEvent : InactivePlatform);
            
            entity.Platform = request.IsActive ? activePlat : inactivePlat;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok("Announcement status updated"));
        }

        [HttpDelete("{id:guid}")]
        [HttpPost("{id:guid}/delete")]
        [Authorize(Roles = "admin,moderator")]
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
