using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Services;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.LeagueOps;
using System.Collections.Generic;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LineWebhookController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly LineWebhookService _lineService;

        public LineWebhookController(MsSqlDbContext context, LineWebhookService lineService)
        {
            _context = context;
            _lineService = lineService;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] LineWebhookRequest request)
        {
            if (request?.Events == null) return Ok();

            foreach (var @event in request.Events)
            {
                if (@event.Type == "message" && @event.Message?.Type == "text")
                {
                    await HandleTextMessage(@event);
                }
            }

            return Ok();
        }

        private async Task HandleTextMessage(LineEvent @event)
        {
            string userMessage = @event.Message!.Text!.Trim();
            string replyToken = @event.ReplyToken;
            string? lineUserId = @event.Source.UserId;

            if (string.IsNullOrEmpty(lineUserId)) return;

            // 1. Check "!ready" command
            if (userMessage.Equals("!ready", StringComparison.OrdinalIgnoreCase))
            {
                await HandleCheckIn(lineUserId, replyToken);
                return;
            }

            // 2. Fallback to Q&A database
            await HandleQA(userMessage, replyToken);
        }

        private async Task HandleCheckIn(string lineUserId, string replyToken)
        {
            // Check time: 17:45 - 23:45
            var now = DateTime.Now;
            var startTime = new TimeSpan(17, 45, 0);
            var endTime = new TimeSpan(23, 45, 0);
            var currentTime = now.TimeOfDay;

            if (currentTime < startTime || currentTime > endTime)
            {
                // Optional: Notify user that it's not check-in time? 
                // The PHP script didn't seem to reply if outside rounds, it just returned false in checkUserCheckedInToday.
                // But it's better to provide feedback.
                /*
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = "ไม่อยู่ในช่วงเวลาการรายงานตัว (17:45 - 23:45)" } 
                });
                */
                return;
            }

            // Find User by LineId
            var user = await _context.Users.FirstOrDefaultAsync(u => u.LineId == lineUserId);
            if (user == null)
            {
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = "ไม่พบข้อมูลผู้ใช้ที่ผูกกับ LINE ID นี้ กรุณาผูกบัญชีก่อนรายงานตัว" } 
                });
                return;
            }

            // Find Active Cycle
            var activeCycle = await _context.LeagueCycles.FirstOrDefaultAsync(c => c.Status == "active");
            if (activeCycle == null)
            {
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = "ยังไม่มีการเปิดรอบการแข่งขันในขณะนี้" } 
                });
                return;
            }

            // Check if already checked in today for this cycle
            var today = now.Date;
            var alreadyCheckedIn = await _context.DailyCheckins.AnyAsync(c => 
                c.UserId == user.UserId && 
                c.CycleId == activeCycle.Id && 
                c.CheckinDate == today);

            if (!alreadyCheckedIn)
            {
                var checkin = new DailyCheckin
                {
                    UserId = user.UserId,
                    CycleId = activeCycle.Id,
                    CheckinDate = today,
                    IsReady = true
                };
                _context.DailyCheckins.Add(checkin);
                await _context.SaveChangesAsync();
            }

            // Send Flex Message
            var profile = await _lineService.GetUserProfileAsync(lineUserId);
            string userName = profile?.DisplayName ?? user.LineName ?? user.UserId;
            string picUrl = profile?.PictureUrl ?? user.LinePic ?? "";
            string datetimeStr = now.ToString("yyyy-MM-dd HH:mm:ss");

            var flexMsg = _lineService.GetCheckInFlexMessage(userName, picUrl, datetimeStr);
            await _lineService.ReplyMessageAsync(replyToken, new List<object> { flexMsg });
        }

        private async Task HandleQA(string question, string replyToken)
        {
            // Search Q&A database for a match (using RAND() equivalent in EF Core if needed, or just first)
            var answer = await _context.QaInformation
                .Where(q => EF.Functions.Like(q.Question, $"%{question}%"))
                .Select(q => q.Answer)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrEmpty(answer))
            {
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = answer } 
                });
            }
        }
    }
}
