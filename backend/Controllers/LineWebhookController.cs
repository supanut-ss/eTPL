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

        private async Task<bool> HandleQA(string question, string replyToken)
        {
            try
            {
                // 1. Skip polite words, short greetings, or noise messages
                var ignoredMessages = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "ครับ", "ค่ะ", "ครับผม", "สวัสดี", "สวัสดีครับ", "สวัสดีค่ะ", "นะ", "คะ", "จ้า", "ดีครับ", "ดีค่ะ", "hello", "hi", "555", "5555"
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

                // 2. Try direct match: DB question must contain the full user message (or be equal)
                var directMatch = allQa
                    .Where(q => 
                        !string.IsNullOrEmpty(q.Question) && 
                        q.Question.Contains(trimmedQuestion, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(q => q.Question.Length)
                    .FirstOrDefault();

                if (directMatch != null)
                {
                    string answer = directMatch.Answer;
                    if (!string.IsNullOrEmpty(answer))
                    {
                        Console.WriteLine($"LINE Webhook: Direct QA Match Found! User: '{trimmedQuestion}' | DB Match: '{directMatch.Question}'");
                        await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                            new { type = "text", text = answer } 
                        });
                        return true;
                    }
                }

                // 3. Fallback to similarity/fuzzy matching
                var rankedMatches = allQa
                    .Select(q => new { Qa = q, Score = CalculateSimilarity(trimmedQuestion, q.Question) })
                    .Where(m => m.Score >= 0.40) // Threshold of 40% similarity
                    .OrderByDescending(m => m.Score)
                    .ToList();

                if (rankedMatches.Count > 0)
                {
                    var bestMatch = rankedMatches.First();
                    Console.WriteLine($"LINE Webhook: Fuzzy QA Match Found! User: '{trimmedQuestion}' | DB Match: '{bestMatch.Qa.Question}' (Score: {bestMatch.Score:F2})");

                    string answer = bestMatch.Qa.Answer;
                    if (!string.IsNullOrEmpty(answer))
                    {
                        await _lineService.ReplyMessageAsync(replyToken, new List<object> { 
                            new { type = "text", text = answer } 
                        });
                        return true;
                    }
                }
                else
                {
                    Console.WriteLine($"LINE Webhook: No fuzzy QA match for '{trimmedQuestion}' (Best score below 0.40)");
                }
                
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in HandleQA: {ex.Message}");
                return false;
            }
        }

        private double CalculateSimilarity(string str1, string str2)
        {
            if (string.IsNullOrEmpty(str1) || string.IsNullOrEmpty(str2))
                return 0;

            str1 = str1.Trim().ToLowerInvariant();
            str2 = str2.Trim().ToLowerInvariant();

            if (str1 == str2)
                return 1.0;

            // If the user message is longer than the DB question, skip fuzzy matching entirely.
            // The direct substring match (Contains) in HandleQA already handles this case.
            if (str1.Length > str2.Length)
                return 0;

            // Fallback to Dice Coefficient
            double dice = CalculateDiceCoefficient(str1, str2);

            // Penalize Dice score if the user message is much shorter than the DB question
            // (prevents very short queries from falsely matching long DB questions)
            double lenRatio = (double)str1.Length / str2.Length;
            if (lenRatio < 0.40)
            {
                dice *= (lenRatio / 0.40);
            }

            return dice;
        }

        private double CalculateDiceCoefficient(string str1, string str2)
        {
            if (str1.Length < 2 || str2.Length < 2)
                return 0;

            var bigrams1 = GetBigrams(str1);
            var bigrams2 = GetBigrams(str2);

            int intersection = 0;
            var bigrams2Copy = new List<string>(bigrams2);

            foreach (var val in bigrams1)
            {
                if (bigrams2Copy.Remove(val))
                {
                    intersection++;
                }
            }

            return (2.0 * intersection) / (bigrams1.Count + bigrams2.Count);
        }

        private List<string> GetBigrams(string str)
        {
            var bigrams = new List<string>();
            for (int i = 0; i < str.Length - 1; i++)
            {
                bigrams.Add(str.Substring(i, 2));
            }
            return bigrams;
        }
    }
}
