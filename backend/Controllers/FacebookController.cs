using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Services.Interfaces;
using eTPL.API.Models.DTOs;
using eTPL.API.Data;
using eTPL.API.Models.Scaffolded;
using Microsoft.Extensions.Configuration;

using eTPL.API.Models;
namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class FacebookController : ControllerBase
    {
        private readonly IFacebookService _facebookService;
        private readonly IWebHostEnvironment _environment;
        private readonly MsSqlDbContext _db;
        private readonly IConfiguration _configuration;

        public FacebookController(IFacebookService facebookService, IWebHostEnvironment environment, MsSqlDbContext db, IConfiguration configuration)
        {
            _facebookService = facebookService;
            _environment = environment;
            _db = db;
            _configuration = configuration;
        }

        [HttpPost("post-message")]
        public async Task<IActionResult> PostMessage([FromBody] FacebookPostRequest request)
        {
            if (string.IsNullOrEmpty(request.Message))
            {
                return BadRequest(ApiResponse<string>.Fail("Message is required"));
            }

            var result = await _facebookService.PostMessageAsync(request.Message);
            return Ok(ApiResponse<string>.Ok(result));
        }

        [HttpPost("post-photo")]
        public async Task<IActionResult> PostPhoto([FromBody] FacebookPhotoRequest request)
        {
            if (string.IsNullOrEmpty(request.ImageUrl))
            {
                return BadRequest(ApiResponse<string>.Fail("ImageUrl is required"));
            }

            string result;
            string imageUrl = request.ImageUrl;

            if (imageUrl.StartsWith("/") && !imageUrl.StartsWith("//"))
            {
                var physicalPath = Path.Combine(_environment.WebRootPath, imageUrl.TrimStart('/'));
                if (System.IO.File.Exists(physicalPath))
                {
                    using var stream = System.IO.File.OpenRead(physicalPath);
                    result = await _facebookService.PostPhotoWithStreamAsync(request.Message ?? "", stream, Path.GetFileName(physicalPath));
                }
                else
                {
                    var absoluteUrl = $"https://thaipesleague.com{imageUrl}";
                    result = await _facebookService.PostPhotoAsync(request.Message ?? "", absoluteUrl);
                }
            }
            else
            {
                result = await _facebookService.PostPhotoAsync(request.Message ?? "", imageUrl);
            }

            return Ok(ApiResponse<string>.Ok(result));
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            try
            {
                var pageId = await _db.TbmSystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingKey == "Facebook_PageId");
                var token = await _db.TbmSystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingKey == "Facebook_PageAccessToken");

                return Ok(ApiResponse<object>.Ok(new
                {
                    PageId = pageId?.SettingValue ?? _configuration["Facebook:PageId"],
                    HasToken = !string.IsNullOrEmpty(token?.SettingValue) || !string.IsNullOrEmpty(_configuration["Facebook:PageAccessToken"]),
                    LastUpdate = token?.UpdateDate
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<string>.Fail("Database Error: " + ex.Message));
            }
        }

        [HttpGet("app-config")]
        public IActionResult GetAppConfig()
        {
            return Ok(ApiResponse<object>.Ok(new
            {
                AppId = _configuration["Facebook:AppId"]
            }));
        }

        [HttpPost("update-token")]
        public async Task<IActionResult> UpdateToken([FromBody] FacebookTokenUpdateRequest request)
        {
            if (string.IsNullOrEmpty(request.UserAccessToken))
                return BadRequest(ApiResponse<string>.Fail("User access token is required"));

            // 1. Exchange for long-lived user token
            var longLivedResult = await _facebookService.GetLongLivedTokenAsync(request.UserAccessToken);
            if (longLivedResult.Contains("\"error\""))
                return BadRequest(ApiResponse<string>.Fail("Failed to exchange long-lived token: " + longLivedResult));

            // Parse token
            var tokenData = System.Text.Json.JsonDocument.Parse(longLivedResult);
            string longLivedToken = tokenData.RootElement.GetProperty("access_token").GetString() ?? "";

            // 2. Get Page Access Token
            // If request.PageId is empty, we might need to fetch it or use the one in config
            string targetPageId = string.IsNullOrEmpty(request.PageId) ? (_configuration["Facebook:PageId"] ?? "") : request.PageId;
            
            var pageTokenResult = await _facebookService.GetPageAccessTokenAsync(longLivedToken, targetPageId);
            if (pageTokenResult.Contains("\"error\""))
                return BadRequest(ApiResponse<string>.Fail("Failed to get page access token: " + pageTokenResult));

            var pageTokenData = System.Text.Json.JsonDocument.Parse(pageTokenResult);
            string pageAccessToken = pageTokenData.RootElement.GetProperty("access_token").GetString() ?? "";

            // 3. Save to Database
            await SaveSettingAsync("Facebook_PageId", targetPageId, "Facebook Page ID for automated posting");
            await SaveSettingAsync("Facebook_PageAccessToken", pageAccessToken, "Long-lived Page Access Token");

            return Ok(ApiResponse<string>.Ok(pageAccessToken, "Facebook Token updated successfully"));
        }

        private async Task SaveSettingAsync(string key, string value, string desc)
        {
            var setting = await _db.TbmSystemSettings.FirstOrDefaultAsync(s => s.SettingKey == key);
            if (setting == null)
            {
                setting = new TbmSystemSetting { SettingKey = key };
                _db.TbmSystemSettings.Add(setting);
            }
            setting.SettingValue = value;
            setting.Description = desc;
            setting.UpdateDate = DateTime.Now;
            await _db.SaveChangesAsync();
        }
    }

    public class FacebookPostRequest
    {
        public string? Message { get; set; }
    }

    public class FacebookPhotoRequest
    {
        public string? Message { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class FacebookTokenUpdateRequest
    {
        public string UserAccessToken { get; set; } = string.Empty;
        public string? PageId { get; set; }
    }
}

