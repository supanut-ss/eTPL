using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class DiscordService : IDiscordService
    {
        private readonly string _webhookUrl;
        private readonly HttpClient _httpClient;
        private readonly Random _random = new Random();

        public DiscordService(IConfiguration configuration)
        {
            _webhookUrl = configuration["Discord:WebhookUrl"] ?? string.Empty;
            _httpClient = new HttpClient();
        }

        public async Task SendMatchResultAsync(string message, bool isEdit = false)
        {
            int color = isEdit ? 0xF1C40F : 0x2ECC71;
            string title = isEdit ? "MATCH RESULT UPDATED" : "MATCH RESULT";
            await SendCustomEmbedAsync(title, message, color);
        }

        public async Task SendAuctionConfirmAsync(string playerName, string teamName, int price, string? pesPlayerId = null)
        {
            string[] headlines = {
                "OFFICIAL: ปิดดีลประมูล!", "ชูเสื้อทางการ!", "คว้าตัวสำเร็จ!", "เปิดตัวสมาชิกใหม่!",
                "ดีลเสร็จสมบูรณ์!", "ยินดีต้อนรับสู่ทีม!", "ปิดจ๊อบประมูล!", "ได้ตัวแล้ว!",
                "เสริมทัพรายใหม่!", "HERE WE GO: ประมูลจบแล้ว!"
            };

            string[] bodies = {
                "**{player}** ตอบตกลงย้ายร่วมทัพ **{team}** ด้วยค่าตัว **{price} TP** เรียบร้อยแล้ว",
                "ทัพ **{team}** ประกาศคว้าตัว **{player}** เสริมแกร่งด้วยงบ **{price} TP**",
                "ประมูลดุเดือด! **{team}** ปาดหน้าคว้า **{player}** เข้าทีมด้วยราคา **{price} TP**",
                "ยินดีต้อนรับ **{player}** สู่ครอบครัว **{team}**! ดีลนี้จบที่ **{price} TP**",
                "สโมสร **{team}** บรรลุข้อตกลงส่วนตัวกับ **{player}** หลังชนะประมูลที่ **{price} TP**",
                "**{player}** พร้อมลงสนามให้ **{team}** แล้ว หลังปิดดีลประมูล **{price} TP**",
                "แฟนบอล **{team}** เฮ! ทีมคว้าตัว **{player}** ร่วมทัพด้วยราคา **{price} TP**",
                "**{player}** จรดปากกาเซ็นสัญญากับ **{team}** หลังจบการประมูลที่ **{price} TP**",
                "ดีลนี้แฟนๆ รอคอย! **{team}** เปิดตัว **{player}** ค่าตัว **{price} TP**",
                "**{player}** กลายเป็นสมาชิกใหม่ของ **{team}** อย่างเป็นทางการด้วยราคา **{price} TP**",
                "บอร์ดบริหาร **{team}** ยันคว้า **{player}** เสริมทัพ หลังทุ่มงบ **{price} TP**",
                "**{player}** เลือกย้ายซบ **{team}** หลังจบศึกประมูลอันยาวนานที่ราคา **{price} TP**",
                "เพชรเม็ดงาม! **{team}** คว้าตัว **{player}** ร่วมทัพในราคา **{price} TP**",
                "**{player}** เตรียมสวมเสื้อ **{team}** สู้ศึกฤดูกาลนี้ หลังดีลจบที่ **{price} TP**",
                "ความท้าทายใหม่! **{player}** ตอบรับข้อเสนอจาก **{team}** ด้วยค่าตัว **{price} TP**",
                "**{team}** ทุ่มสุดตัว! คว้า **{player}** ร่วมทีมสำเร็จที่ราคา **{price} TP**",
                "ดีลประวัติศาสตร์! **{player}** ย้ายสู่ **{team}** หลังประมูลจบที่ **{price} TP**",
                "สายเลือดใหม่! **{team}** ดึง **{player}** มาเสริมทัพด้วยงบ **{price} TP**",
                "**{player}** พร้อมล่าตาข่ายให้ **{team}** หลังปิดดีล **{price} TP**",
                "ปิดตลาดประมูลสวยงาม! **{team}** ได้ตัว **{player}** ราคา **{price} TP**"
            };

            string headline = headlines[_random.Next(headlines.Length)];
            string bodyText = bodies[_random.Next(bodies.Length)]
                .Replace("{player}", playerName)
                .Replace("{team}", teamName)
                .Replace("{price}", price.ToString("N0"));

            string? imageUrl = null;
            if (!string.IsNullOrEmpty(pesPlayerId))
            {
                imageUrl = $"https://pesdb.net/assets/img/card/f{pesPlayerId}.png";
                bodyText += $"\n\n[ดูข้อมูลนักเตะเพิ่มเติม](https://pesdb.net/efootball/?id={pesPlayerId})";
            }

            await SendCustomEmbedAsync("AUCTION CONFIRMED", $"**{headline}**\n\n{bodyText}", 0xEC7063, imageUrl);
        }

        public async Task SendTransferAsync(string playerName, string fromTeam, string toTeam, int price, bool isLoan = false, string? pesPlayerId = null)
        {
            string type = isLoan ? "ยืมตัว (Loan)" : "ซื้อขาย (Transfer)";
            string[] headlines;
            string[] transferBodies;

            if (isLoan)
            {
                headlines = new[] {
                    "LOAN DEAL: ยืมตัวสำเร็จ!", "เสริมทัพชั่วคราว!", "มาหาประสบการณ์!", "ตกลงสัญญายืมตัว!",
                    "สัญญาระยะสั้น!", "ย้ายทีมชั่วคราว!", "พร้อมช่วยทีม!", "ดีลยืมตัวเสร็จสิ้น!",
                    "ร่วมทัพแบบยืมตัว!", "ดีลลับยืมตัว!"
                };
                transferBodies = new[] {
                    "**{player}** ตอบรับสัญญายืมตัวจาก **{from}** สู่ **{to}** ด้วยค่าเหนื่อย **{price} TP**",
                    "ทัพ **{to}** บรรลุข้อตกลงยืมตัว **{player}** จาก **{from}** มาใช้งานด้วยงบ **{price} TP**",
                    "**{player}** เตรียมหาความท้าทายใหม่แบบยืมตัวที่ **{to}** หลังตกลงกับ **{from}** ที่ราคา **{price} TP**",
                    "ดีลช่วยทีม! **{to}** ดึง **{player}** มาเสริมแกร่งชั่วคราวจาก **{from}** ด้วยงบ **{price} TP**",
                    "**{player}** พร้อมลงสนามให้ **{to}** ในสัญญายืมตัวจาก **{from}** ราคา **{price} TP**",
                    "สโมสร **{from}** ปล่อยตัว **{player}** ให้ **{to}** ยืมใช้งานด้วยค่าตัว **{price} TP**",
                    "โอกาสโชว์ของ! **{player}** ย้ายไป **{to}** แบบยืมตัวจาก **{from}** งบ **{price} TP**",
                    "**{to}** ประกาศเปิดตัว **{player}** สัญญายืมตัวจาก **{from}** มูลค่า **{price} TP**",
                    "**{player}** จรดปากกาเซ็นยืมตัวกับ **{to}** โดยย้ายมาจาก **{from}** ด้วยงบ **{price} TP**",
                    "ร่วมทัพชั่วคราว! **{player}** ย้ายซบ **{to}** จาก **{from}** ในราคา **{price} TP**",
                    "**{from}** ยันปล่อย **{player}** ให้ **{to}** ยืมตัวสู้ศึกในราคา **{price} TP**",
                    "**{player}** เลือกไปเก็บเลเวลกับ **{to}** หลังดีลยืมตัวจาก **{from}** จบที่ **{price} TP**",
                    "ดีลนี้ลงตัว! **{to}** ได้ **{player}** มาช่วยทีมจาก **{from}** งบ **{price} TP**",
                    "**{player}** เตรียมสวมเสื้อ **{to}** แบบชั่วคราว หลังย้ายจาก **{from}** ราคา **{price} TP**",
                    "ความท้าทายระยะสั้น! **{player}** ย้ายสู่ **{to}** จาก **{from}** ด้วยค่าตัว **{price} TP**",
                    "**{to}** คว้า **{player}** เสริมทัพแบบยืมตัวจาก **{from}** สำเร็จที่ราคา **{price} TP**",
                    "ดีลยืมตัวสายฟ้าแลบ! **{player}** ย้ายซบ **{to}** จาก **{from}** งบ **{price} TP**",
                    "**{from}** ยอมปล่อย **{player}** ให้ **{to}** ยืมใช้งานชั่วคราวด้วยงบ **{price} TP**",
                    "**{player}** พร้อมล่าตาข่ายให้ **{to}** ในสัญญายืมตัวจาก **{from}** ราคา **{price} TP**",
                    "ปิดดีลยืมตัวสวยงาม! **{to}** ได้ตัว **{player}** มาจาก **{from}** งบ **{price} TP**"
                };
            }
            else
            {
                headlines = new[] {
                    "TRANSFER: ย้ายค่ายทางการ!", "ปิดดีลสนั่นลีก!", "อำลาทีมเก่า!", "ดีลประวัติศาสตร์!",
                    "ย้ายทีมทางการ!", "ปิดดีลสายฟ้าแลบ!", "ชูเสื้อสโมสรใหม่!", "ย้ายร่วมทัพ!",
                    "โบกมือลาทีมเก่า!", "ดีลใหญ่จบแล้ว!"
                };
                transferBodies = new[] {
                    "**{player}** บรรลุข้อตกลงย้ายจาก **{from}** สู่ **{to}** ถาวรด้วยค่าตัว **{price} TP**",
                    "ทัพ **{to}** ประกาศคว้าตัว **{player}** จาก **{from}** มาร่วมทีมด้วยงบ **{price} TP**",
                    "ปิดฉากกับทีมเก่า! **{player}** ย้ายซบ **{to}** จาก **{from}** เรียบร้อยในราคา **{price} TP**",
                    "ดีลใหญ่แห่งปี! **{to}** ทุ่มงบ **{price} TP** ดึง **{player}** มาจาก **{from}** สำเร็จ",
                    "**{player}** เตรียมเริ่มต้นชีวิตใหม่ที่ **{to}** หลังย้ายจาก **{from}** ด้วยค่าตัว **{price} TP**",
                    "สโมสร **{from}** ยืนยันขาย **{player}** ให้กับ **{to}** ในราคา **{price} TP**",
                    "อำลาแฟนบอล! **{player}** ย้ายไปร่วมทัพ **{to}** จาก **{from}** ด้วยงบ **{price} TP**",
                    "**{to}** เปิดตัว **{player}** อย่างเป็นทางการ หลังย้ายมาจาก **{from}** ราคา **{price} TP**",
                    "**{player}** จรดปากกาเซ็นสัญญากับ **{to}** หลังปิดดีลซื้อขาดจาก **{from}** มูลค่า **{price} TP**",
                    "ร่วมทัพถาวร! **{player}** ย้ายซบ **{to}** จาก **{from}** ในราคา **{price} TP**",
                    "**{from}** ปล่อยตัวหลัก! **{player}** ย้ายสู่ **{to}** ด้วยงบ **{price} TP**",
                    "**{player}** เลือกเดินตามฝันกับ **{to}** หลังดีลจาก **{from}** จบที่ **{price} TP**",
                    "ดีลนี้จบสวย! **{to}** ได้ **{player}** มาคุมทัพจาก **{from}** งบ **{price} TP**",
                    "**{player}** สวมเสื้อตัวใหม่! ย้ายจาก **{from}** สู่ **{to}** ในราคา **{price} TP**",
                    "ความท้าทายครั้งใหม่! **{player}** ย้ายถาวรไป **{to}** จาก **{from}** ด้วยค่าตัว **{price} TP**",
                    "**{to}** คว้าตัวรุกระดับโลก! **{player}** ย้ายมาจาก **{from}** สำเร็จที่ราคา **{price} TP**",
                    "ดีลสนั่นเมือง! **{player}** ย้ายจาก **{from}** ซบ **{to}** งบ **{price} TP**",
                    "**{from}** ยอมปล่อยตัวเก่ง! **{player}** ไปร่วมทีม **{to}** ด้วยงบ **{price} TP**",
                    "**{player}** พร้อมล่าความสำเร็จกับ **{to}** หลังย้ายจาก **{from}** ราคา **{price} TP**",
                    "ปิดตลาดซื้อขายสวยงาม! **{to}** คว้า **{player}** มาจาก **{from}** งบ **{price} TP**"
                };
            }

            string headline = headlines[_random.Next(headlines.Length)];
            string bodyText = transferBodies[_random.Next(transferBodies.Length)]
                .Replace("{player}", playerName)
                .Replace("{from}", fromTeam)
                .Replace("{to}", toTeam)
                .Replace("{price}", price.ToString("N0"));

            string? imageUrl = null;
            if (!string.IsNullOrEmpty(pesPlayerId))
            {
                imageUrl = $"https://pesdb.net/assets/img/card/f{pesPlayerId}.png";
                bodyText += $"\n\n[ดูข้อมูลนักเตะเพิ่มเติม](https://pesdb.net/efootball/?id={pesPlayerId})";
            }

            int color = isLoan ? 0x9B59B6 : 0xE67E22;
            await SendCustomEmbedAsync("TRANSFER UPDATE", $"**{headline}**\n\n{bodyText}", color, imageUrl);
        }

        public async Task SendNewsAnnouncementAsync(string message)
        {
            string? imageUrl = null;
            var imageMatch = Regex.Match(message, @"(https?://[^\s]+(\.jpg|\.png|\.gif|\.webp|\.jpeg))", RegexOptions.IgnoreCase);
            if (imageMatch.Success)
            {
                imageUrl = imageMatch.Groups[1].Value;
                // Remove the image URL from the message body
                message = message.Replace(imageUrl, "").Trim();
            }

            await SendCustomEmbedAsync("NEWS", message, 0xFF69B4, imageUrl);
        }

        public async Task SendSeasonEventAsync(string title, string message)
        {
            await SendCustomEmbedAsync(title, message, 0x3498DB);
        }

        public async Task SendPlayerListedAsync(string playerName, string teamName, int price, string? pesPlayerId = null)
        {
            string[] headlines = {
                "MARKET: นักเตะใหม่ในตลาด!", "พร้อมรับข้อเสนอ!", "เตรียมย้ายทีม?", "ตลาดขยับแล้ว!",
                "ประกาศขายสายฟ้าแลบ!", "นักเตะว่างงานรอดีล!", "ขึ้นบัญชีขาย!", "ดีลนี้ใครจะเอา?",
                "พร้อมปล่อยตัว!", "สโมสรเปิดไฟเขียว!"
            };

            string[] bodies = {
                "สโมสร **{team}** ประกาศตั้งขาย **{player}** ในราคาเริ่มต้น **{price} TP**",
                "ใครสนใจบ้าง? **{team}** พร้อมปล่อย **{player}** ออกจากทีมที่ราคา **{price} TP**",
                "ตลาดนักเตะเริ่มคึกคัก! **{player}** ถูกขึ้นบัญชีขายโดย **{team}** ราคา **{price} TP**",
                "**{team}** เปิดรับข้อเสนอสำหรับ **{player}** ราคาที่ต้องการคือ **{price} TP**",
                "พร้อมย้าย! **{player}** เตรียมลา **{team}** หลังถูกตั้งค่าตัวไว้ที่ **{price} TP**",
                "ดีลดีต้องรีบคว้า! **{team}** ปล่อย **{player}** ลงตลาดด้วยงบ **{price} TP**",
                "**{player}** ตกเป็นข่าวเตรียมย้ายทีม หลัง **{team}** ตั้งขายที่ราคา **{price} TP**",
                "สโมสร **{team}** ยันพร้อมปล่อย **{player}** หากได้ข้อเสนอระดับ **{price} TP**",
                "ขึ้นป้ายขาย! **{player}** พร้อมออกจาก **{team}** ในราคา **{price} TP**",
                "**{team}** เปิดไฟเขียวให้ **{player}** ย้ายทีมได้ที่ราคา **{price} TP**",
                "ข่าวลือเป็นจริง! **{team}** ตั้งขาย **{player}** เรียบร้อยที่งบ **{price} TP**",
                "พร้อมเจรจา! **{player}** ถูก **{team}** วางขายในตลาดด้วยราคา **{price} TP**",
                "ด่วน! **{team}** ประกาศขาย **{player}** หวังระดมทุนที่ราคา **{price} TP**",
                "ใครจะเป็นเจ้าของใหม่? **{player}** ถูกปล่อยลงตลาดโดย **{team}** ราคา **{price} TP**",
                "**{player}** เตรียมเก็บกระเป๋า! หลัง **{team}** ตั้งราคาขายไว้ที่ **{price} TP**",
                "ตลาดนักเตะเดือด! **{team}** ปล่อย **{player}** ในราคาสุดคุ้ม **{price} TP**",
                "**{player}** พร้อมหาความท้าทายใหม่ หลัง **{team}** ตั้งขายที่ **{price} TP**",
                "ยืนยันทางการ! **{team}** ปล่อย **{player}** สู่ตลาดนักเตะในงบ **{price} TP**",
                "สโมสร **{team}** พร้อมแยกทางกับ **{player}** หากได้รับข้อเสนอ **{price} TP**",
                "ปิดดีลรอคนมาซื้อ! **{team}** วางขาย **{player}** ในราคา **{price} TP**"
            };

            string headline = headlines[_random.Next(headlines.Length)];
            string bodyText = bodies[_random.Next(bodies.Length)]
                .Replace("{player}", playerName)
                .Replace("{team}", teamName)
                .Replace("{price}", price.ToString("N0"));

            string? imageUrl = null;
            if (!string.IsNullOrEmpty(pesPlayerId))
            {
                imageUrl = $"https://pesdb.net/assets/img/card/f{pesPlayerId}.png";
                bodyText += $"\n\n[ดูข้อมูลนักเตะเพิ่มเติม](https://pesdb.net/efootball/?id={pesPlayerId})";
            }

            await SendCustomEmbedAsync("MARKET UPDATE", $"**{headline}**\n\n{bodyText}", 0xF1C40F, imageUrl);
        }

        public async Task SendCustomEmbedAsync(string title, string description, int color, string? imageUrl = null)
        {
            try
            {
                if (string.IsNullOrEmpty(_webhookUrl)) return;

                var payload = new
                {
                    embeds = new[]
                    {
                        new
                        {
                            title = title,
                            description = description,
                            color = color,
                            timestamp = DateTime.UtcNow.ToString("o"),
                            image = string.IsNullOrEmpty(imageUrl) ? null : new { url = imageUrl },
                            footer = new { text = "TPL FA" }
                        }
                    }
                };

                var options = new JsonSerializerOptions
                {
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                
                var json = JsonSerializer.Serialize(payload, options);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(_webhookUrl, content);
                if (!response.IsSuccessStatusCode)
                {
                    string error = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Discord Send Failed: {response.StatusCode} - {error}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Discord Error: {ex.Message}");
            }
        }
    }
}
