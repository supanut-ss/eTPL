using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Services;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.LeagueOps;
using eTPL.API.Services.Interfaces;
using System.Collections.Generic;
using System.Text.Json;

namespace eTPL.API.Controllers
{
    [Route("api/linewebhook")]
    [ApiController]
    public class LineWebhookController : ControllerBase
    {
        private readonly MsSqlDbContext _context;
        private readonly LineWebhookService _lineService;
        private readonly IAiService _aiService;
        private readonly IDiscordService _discordService;

        public LineWebhookController(MsSqlDbContext context, LineWebhookService lineService, IAiService aiService, IDiscordService discordService)
        {
            _context = context;
            _lineService = lineService;
            _aiService = aiService;
            _discordService = discordService;
        }

        [HttpGet("check")]
        public IActionResult Check()
        {
            return Ok(new
            {
                Status = "Active",
                TimeICT = DateTime.UtcNow.AddHours(7),
                Message = "LineWebhookController is reachable!",
                AccessTokenConfigured = _lineService.IsTokenConfigured
            });
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok("Line Webhook is Active!");
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] System.Text.Json.Nodes.JsonNode? payload)
        {
            if (payload == null)
            {
                Console.WriteLine("LINE Webhook: Payload is null");
                return Ok();
            }

            try
            {
                var options = new JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true 
                };
                var request = JsonSerializer.Deserialize<LineWebhookRequest>(payload, options);

                if (request == null)
                {
                    Console.WriteLine("LINE Webhook: Request is null after deserialization");
                    return Ok();
                }

                if (request.Events == null || request.Events.Count == 0)
                {
                    Console.WriteLine("LINE Webhook: No events received (Verification request?)");
                    return Ok();
                }

                foreach (var @event in request.Events)
                {
                    if (@event == null) continue;
                    
                    // Immediately skip dummy verification events to guarantee sub-millisecond response times
                    if (string.IsNullOrEmpty(@event.ReplyToken) || 
                        @event.ReplyToken.Equals("00000000000000000000000000000000", StringComparison.OrdinalIgnoreCase) || 
                        @event.ReplyToken.Equals("ffffffffffffffffffffffffffffffff", StringComparison.OrdinalIgnoreCase))
                    {
                        Console.WriteLine("LINE Webhook: Ignoring dummy verification event.");
                        continue;
                    }

                    Console.WriteLine($"Incoming LINE Event: {@event.Type ?? "unknown"} (Token: {@event.ReplyToken ?? "none"})");
                    if (@event.Type == "message" && @event.Message?.Type == "text")
                    {
                        await HandleTextMessage(@event);
                    }
                    else
                    {
                        Console.WriteLine($"Skipping non-text event: {@event.Type}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"LINE Webhook Exception during parsing: {ex.Message}");
            }

            return Ok();
        }

        private async Task HandleTextMessage(LineEvent @event)
        {
            if (@event == null || @event.Message == null || string.IsNullOrEmpty(@event.Message.Text) || string.IsNullOrEmpty(@event.ReplyToken) || @event.Source == null)
            {
                return;
            }

            string sourceType = @event.Source.Type ?? "";
            if (!sourceType.Equals("group", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine($"LINE Webhook: Ignoring non-group message source type: '{sourceType}' (only group chat allowed)");
                return;
            }

            string userMessage = @event.Message.Text.Trim();
            string replyToken = @event.ReplyToken;
            string? lineUserId = @event.Source.UserId;

            Console.WriteLine($"LINE Message from {lineUserId} (Source: {sourceType}): {userMessage}");

            // A. Check "มิยุ" prefix (Gemini AI Chat)
            if (userMessage.StartsWith("มิยุ", StringComparison.OrdinalIgnoreCase))
            {
                string question = userMessage.Trim();
                if (!string.IsNullOrEmpty(question))
                {
                    string aiResponse = await _aiService.AskGeminiAsync(question);
                    await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                        new { type = "text", text = aiResponse } 
                    });
                }
                return;
            }

            // 0. Check "!test" command
            if (userMessage.Equals("!test", StringComparison.OrdinalIgnoreCase))
            {
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = $"Bot is working! Server ICT Time: {DateTime.UtcNow.AddHours(7):HH:mm:ss}" } 
                });
                return;
            }

            // 1. Check "!ready" command
            if (userMessage.Equals("!ready", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(lineUserId))
                {
                    await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                        new { type = "text", text = "ไม่สามารถรายงานตัวได้ เนื่องจากบอตไม่สามารถเข้าถึง LINE ID ของคุณได้ (กรุณาเพิ่มเพื่อนกับแชทบอตก่อน)" } 
                    });
                    return;
                }
                await HandleCheckIn(lineUserId, replyToken);
                return;
            }

            // 1.5. Check "!fixture" command
            if (userMessage.Equals("!fixture", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(lineUserId))
                {
                    await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                        new { type = "text", text = "ไม่สามารถดูตารางแข่งได้ เนื่องจากบอตไม่สามารถเข้าถึง LINE ID ของคุณได้ (กรุณาเพิ่มเพื่อนกับแชทบอตก่อน)" } 
                    });
                    return;
                }
                await HandleFixtureCommand(lineUserId, replyToken);
                return;
            }

            // 2. Fallback to Q&A database
            bool handled = await HandleQA(userMessage, replyToken);

            // 3. Default Response if not handled
            if (!handled)
            {
                Console.WriteLine($"Message not handled: {userMessage}");
                /*
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = $"[BOT DEBUG] ได้รับข้อความ: {userMessage}\n(ไม่พบใน Q&A หรือคำสั่งระบบ)" } 
                });
                */
            }
        }

        private async Task HandleCheckIn(string lineUserId, string replyToken)
        {
            try
            {
                // Use ICT Time (GMT+7)
                var now = DateTime.UtcNow.AddHours(7);
                var startTime = new TimeSpan(17, 45, 0);
                var endTime = new TimeSpan(23, 45, 0);
                var currentTime = now.TimeOfDay;

                if (currentTime < startTime || currentTime > endTime)
                {
                    await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                        new { type = "text", text = $"ไม่อยู่ในช่วงเวลาการรายงานตัว (17:45 - 23:45)\nเวลาเซิร์ฟเวอร์ (ICT): {now:HH:mm:ss}" } 
                    });
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

                // Fetch profile info (needed for both Discord notification and flex message)
                var profile = await _lineService.GetUserProfileAsync(lineUserId);
                string userName = profile?.DisplayName ?? user.LineName ?? user.UserId;
                string picUrl = profile?.PictureUrl ?? user.LinePic ?? "";
                string datetimeStr = now.ToString("yyyy-MM-dd HH:mm:ss");

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

                    // Notify Discord (new check-in only)
                    await _discordService.SendCustomEmbedAsync(
                        "PLAYER CHECK-IN",
                        $"👤 **{userName}** รายงานตัวแล้ว ✅\n🕐 **เวลา:** {datetimeStr}",
                        0xff9913
                    );
                }

                var flexMsg = _lineService.GetCheckInFlexMessage(userName, picUrl, datetimeStr);
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { flexMsg });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in HandleCheckIn: {ex.Message}");
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = "ขออภัย เกิดข้อผิดพลาดในระบบรายงานตัว" } 
                });
            }
        }

        private async Task HandleFixtureCommand(string lineUserId, string replyToken)
        {
            try
            {
                // Find User by LineId
                var user = await _context.Users.FirstOrDefaultAsync(u => u.LineId == lineUserId);
                if (user == null)
                {
                    await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                        new { type = "text", text = "ไม่พบข้อมูลผู้ใช้ที่ผูกกับ LINE ID นี้ กรุณาผูกบัญชีก่อนเรียกดูตารางการแข่งขัน" } 
                    });
                    return;
                }

                // Find Current Season
                var currentSeason = await _context.TbmCurrentSeasons
                    .Where(s => s.Platform == "PC")
                    .Select(s => s.Season)
                    .FirstOrDefaultAsync();

                string division = user.CurrentDivision ?? "D1";

                // Query user's unplayed fixtures
                var query = _context.VFixtureAlls
                    .Where(f => f.Platform == "PC" && f.Division == division && f.Active == "YES" && 
                                (f.Home == user.UserId || f.Away == user.UserId) &&
                                (f.HomeScore == null || f.AwayScore == null));

                if (currentSeason.HasValue)
                {
                    query = query.Where(f => f.Season == currentSeason.Value);
                }

                var fixtures = await query
                    .OrderBy(f => f.Match)
                    .ToListAsync();

                if (fixtures == null || fixtures.Count == 0)
                {
                    await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                        new { type = "text", text = "ไม่มีโปรแกรมการแข่งขันตกค้าง" } 
                    });
                    return;
                }

                string userName = user.LineName ?? user.UserId;
                var flexMsg = _lineService.GetFixtureFlexMessage(user.UserId, userName, division, currentSeason, fixtures, user.CurrentTeam);
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { flexMsg });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in HandleFixtureCommand: {ex.Message}");
                await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                    new { type = "text", text = "ขออภัย เกิดข้อผิดพลาดในระบบเรียกดูตารางการแข่งขัน" } 
                });
            }
        }

        private async Task<bool> HandleQA(string question, string replyToken)
        {
            try
            {
                // 1. Skip polite words, short greetings, or noise messages
                var ignoredMessages = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "ครับ", "ค่ะ", "ครับผม", "สวัสดี", "สวัสดีครับ", "สวัสดีค่ะ", "นะ", "คะ", "จ้า", "ดีครับ", "ดีค่ะ", "hello", "hi", "555", "5555","ใช่คับ", "คับผม","ใช่","ไม่","หรอ","ไม่ใช่"
                };

                string trimmedQuestion = question.Trim();
                if (ignoredMessages.Contains(trimmedQuestion) || trimmedQuestion.Length < 2)
                {
                    return false;
                }

                // Retrieve all Q&A entries from the database
                var allQa = await _context.QaInformation.ToListAsync();
                if (allQa == null || allQa.Count == 0)
                {
                    return false;
                }

                // 2. Try direct match: DB question must contain the user's message as a substring
                //    e.g. user types "รีฟ" → matches DB question "อารีฟ"
                var directMatches = allQa
                    .Where(q =>
                        !string.IsNullOrEmpty(q.Question) &&
                        q.Question.Contains(trimmedQuestion, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (directMatches.Any())
                {
                    // Select one randomly
                    var random = new Random();
                    var directMatch = directMatches[random.Next(directMatches.Count)];
                    string answer = directMatch.Answer;
                    if (!string.IsNullOrEmpty(answer))
                    {
                        Console.WriteLine($"LINE Webhook: Direct QA Match Found! User: '{trimmedQuestion}' | DB Match: '{directMatch.Question}' (Random from {directMatches.Count} matches)");
                        await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                            new { type = "text", text = answer } 
                        });
                        return true;
                    }
                }

                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in HandleQA: {ex.Message}");
                return false;
            }
        }


    }
}
