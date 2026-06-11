using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/worldcup")]
    [AllowAnonymous]
    public class WorldCupPredictionController : ControllerBase
    {
        private readonly MsSqlDbContext _db;

        public WorldCupPredictionController(MsSqlDbContext db)
        {
            _db = db;
        }

        [HttpGet("predictions")]
        public async Task<IActionResult> GetPredictions()
        {
            // Get deadline setting
            var deadlineSetting = await _db.TbmSystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "WorldCup_PredictionDeadline");

            var deadline = new DateTimeOffset(2026, 6, 27, 23, 59, 59, TimeSpan.FromHours(7)); // Default Bangkok GMT+7

            if (deadlineSetting != null && DateTimeOffset.TryParse(deadlineSetting.SettingValue, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedOffset))
            {
                // Safeguard: Convert Thai Buddhist Era year (e.g. 2569) to Gregorian year (2026) if database has it stored as พ.ศ.
                if (parsedOffset.Year > 2500)
                {
                    parsedOffset = new DateTimeOffset(parsedOffset.Year - 543, parsedOffset.Month, parsedOffset.Day, parsedOffset.Hour, parsedOffset.Minute, parsedOffset.Second, parsedOffset.Offset);
                }
                deadline = parsedOffset;
            }

            var isExpired = DateTimeOffset.UtcNow > deadline;

            // Get predictions
            var predictions = await _db.WorldCupPredictions
                .Include(p => p.User)
                .AsNoTracking()
                .Select(p => new
                {
                    p.Id,
                    p.UserId,
                    UserIdString = p.User != null ? p.User.UserId : string.Empty,
                    LineName = p.User != null ? p.User.LineName : string.Empty,
                    LinePic = p.User != null ? p.User.LinePic : string.Empty,
                    TeamNickname = p.User != null ? p.User.TeamNickname : string.Empty,
                    CurrentTeam = p.User != null ? p.User.CurrentTeam : string.Empty,
                    p.PredictedTeam,
                    p.UpdatedAt
                })
                .ToListAsync();

            // Get all active users for the dropdown
            var allUsers = await _db.Users
                .AsNoTracking()
                .Select(u => new
                {
                    u.Id,
                    u.UserId,
                    u.LineName,
                    u.LinePic,
                    u.TeamNickname,
                    u.CurrentTeam
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                predictions,
                allUsers,
                deadline = deadline.ToString("yyyy-MM-ddTHH:mm:sszzz", System.Globalization.CultureInfo.InvariantCulture),
                serverTime = DateTimeOffset.UtcNow.ToString("yyyy-MM-ddTHH:mm:sszzz", System.Globalization.CultureInfo.InvariantCulture),
                isExpired
            }));
        }

        private async Task<int> GetCurrentUserIdAsync()
        {
            var userStrId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userStrId)) throw new UnauthorizedAccessException("ไม่พบข้อมูลผู้ใช้");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userStrId);
            if (user == null) throw new UnauthorizedAccessException("ไม่พบข้อมูลผู้ใช้ในระบบ");

            return user.Id;
        }

        [HttpPost("predictions")]
        [Authorize]
        public async Task<IActionResult> SubmitPrediction([FromBody] SubmitPredictionRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.PredictedTeam))
            {
                return BadRequest(ApiResponse<string>.Fail("ข้อมูลไม่ถูกต้อง"));
            }

            int userId;
            try
            {
                userId = await GetCurrentUserIdAsync();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<string>.Fail(ex.Message));
            }

            // Verify User exists
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<string>.Fail("ไม่พบข้อมูลสมาชิก"));
            }

            // Check deadline
            var deadlineSetting = await _db.TbmSystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "WorldCup_PredictionDeadline");

            var deadline = new DateTimeOffset(2026, 6, 27, 23, 59, 59, TimeSpan.FromHours(7)); // Default Bangkok GMT+7

            if (deadlineSetting != null && DateTimeOffset.TryParse(deadlineSetting.SettingValue, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedOffset))
            {
                // Safeguard: Convert Thai Buddhist Era year (e.g. 2569) to Gregorian year (2026)
                if (parsedOffset.Year > 2500)
                {
                    parsedOffset = new DateTimeOffset(parsedOffset.Year - 543, parsedOffset.Month, parsedOffset.Day, parsedOffset.Hour, parsedOffset.Minute, parsedOffset.Second, parsedOffset.Offset);
                }
                deadline = parsedOffset;
            }

            if (DateTimeOffset.UtcNow > deadline)
            {
                return BadRequest(ApiResponse<string>.Fail("หมดเวลาร่วมทายผลแชมป์ฟุตบอลโลก 2026 แล้ว"));
            }

            // Upsert prediction
            var prediction = await _db.WorldCupPredictions
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (prediction == null)
            {
                prediction = new WorldCupPrediction
                {
                    UserId = userId,
                    PredictedTeam = request.PredictedTeam.Trim(),
                    UpdatedAt = DateTime.UtcNow
                };
                _db.WorldCupPredictions.Add(prediction);
            }
            else
            {
                prediction.PredictedTeam = request.PredictedTeam.Trim();
                prediction.UpdatedAt = DateTime.UtcNow;
                _db.WorldCupPredictions.Update(prediction);
            }

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                prediction.Id,
                prediction.UserId,
                prediction.PredictedTeam,
                prediction.UpdatedAt
            }, "บันทึกคำทำนายของคุณเรียบร้อยแล้ว!"));
        }

        [HttpDelete("predictions/{id}")]
        [Authorize]
        public async Task<IActionResult> DeletePrediction(int id)
        {
            // Verify roles
            var userLevel = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userLevel != "admin" && userLevel != "moderator" && !User.IsInRole("admin"))
            {
                return Forbid();
            }

            var prediction = await _db.WorldCupPredictions.FindAsync(id);
            if (prediction == null)
            {
                return NotFound(ApiResponse<string>.Fail("ไม่พบคำทำนาย"));
            }

            _db.WorldCupPredictions.Remove(prediction);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok("ลบคำทำนายสำเร็จ"));
        }

        [HttpPost("deadline")]
        [Authorize]
        public async Task<IActionResult> UpdateDeadline([FromBody] UpdateDeadlineRequest request)
        {
            // Verify roles
            var userLevel = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userLevel != "admin" && userLevel != "moderator" && !User.IsInRole("admin"))
            {
                return Forbid();
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Deadline))
            {
                return BadRequest(ApiResponse<string>.Fail("ข้อมูลไม่ถูกต้อง"));
            }

            if (!DateTimeOffset.TryParse(request.Deadline, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedOffset))
            {
                return BadRequest(ApiResponse<string>.Fail("รูปแบบวันที่ไม่ถูกต้อง ควรเป็น ISO-8601 (เช่น 2026-06-27T23:59:59+07:00)"));
            }

            // Convert Buddhist Era to Gregorian if parsed offset year is in Buddhist Era
            var dbValueToSave = request.Deadline;
            if (parsedOffset.Year > 2500)
            {
                parsedOffset = new DateTimeOffset(parsedOffset.Year - 543, parsedOffset.Month, parsedOffset.Day, parsedOffset.Hour, parsedOffset.Minute, parsedOffset.Second, parsedOffset.Offset);
                dbValueToSave = parsedOffset.ToString("yyyy-MM-ddTHH:mm:sszzz", System.Globalization.CultureInfo.InvariantCulture);
            }

            var setting = await _db.TbmSystemSettings
                .FirstOrDefaultAsync(s => s.SettingKey == "WorldCup_PredictionDeadline");

            if (setting == null)
            {
                setting = new TbmSystemSetting
                {
                    SettingKey = "WorldCup_PredictionDeadline",
                    SettingValue = dbValueToSave,
                    Description = "World Cup 2026 Champion Prediction Deadline (ISO-8601 offset string)",
                    UpdateDate = DateTime.Now
                };
                _db.TbmSystemSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = dbValueToSave;
                setting.UpdateDate = DateTime.Now;
                _db.TbmSystemSettings.Update(setting);
            }

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<string>.Ok(request.Deadline, "อัปเดตกำหนดการส่งคำทำนายเรียบร้อยแล้ว"));
        }
    }

    public class SubmitPredictionRequest
    {
        public string PredictedTeam { get; set; } = string.Empty;
    }

    public class UpdateDeadlineRequest
    {
        public string Deadline { get; set; } = string.Empty;
    }
}
