using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Services.Interfaces;

using eTPL.API.Models;
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

        private readonly MsSqlDbContext _db;
        private readonly IDiscordService _discordService;
        private readonly IFacebookService _facebookService;
        private readonly IWebHostEnvironment _environment;

        public AnnouncementController(MsSqlDbContext db, IDiscordService discordService, IFacebookService facebookService, IWebHostEnvironment environment)
        {
            _db = db;
            _discordService = discordService;
            _facebookService = facebookService;
            _environment = environment;
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
                    IsSharedFacebook = a.IsSharedFacebook ?? false,
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
                    IsSharedFacebook = a.IsSharedFacebook ?? false,
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

        [HttpPost("{id:guid}/share-facebook")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> ShareFacebook(Guid id)
        {
            var entity = await _db.TbmAnnouces.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return NotFound(ApiResponse<string>.Fail("Announcement not found"));

            if (entity.IsSharedFacebook == true)
                return BadRequest(ApiResponse<string>.Fail("This announcement has already been shared to Facebook"));

            string result;
            if (!string.IsNullOrEmpty(entity.ImageUrl))
            {
                // If it's a relative path (e.g., /uploads/...), we should upload the file directly
                string imageUrl = entity.ImageUrl;
                if (imageUrl.StartsWith("/") && !imageUrl.StartsWith("//"))
                {
                    // Resolve physical path
                    var physicalPath = Path.Combine(_environment.WebRootPath, imageUrl.TrimStart('/'));
                    if (System.IO.File.Exists(physicalPath))
                    {
                        using var stream = System.IO.File.OpenRead(physicalPath);
                        result = await _facebookService.PostPhotoWithStreamAsync(entity.Announcement ?? "", stream, Path.GetFileName(physicalPath));
                    }
                    else
                    {
                        // Fallback to Production URL if file not found locally
                        var absoluteUrl = $"https://thaipesleague.com{imageUrl}";
                        result = await _facebookService.PostPhotoAsync(entity.Announcement ?? "", absoluteUrl);
                    }
                }
                else
                {
                    // External URL
                    result = await _facebookService.PostPhotoAsync(entity.Announcement ?? "", imageUrl);
                }
            }
            else
            {
                result = await _facebookService.PostMessageAsync(entity.Announcement ?? "");
            }

            // Check if Facebook returned an error in the JSON string
            if (result.Contains("\"error\""))
            {
                return BadRequest(ApiResponse<string>.Fail("Facebook API Error: " + result));
            }

            entity.IsSharedFacebook = true;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok(result, "Successfully shared to Facebook"));
        }
    }
}

