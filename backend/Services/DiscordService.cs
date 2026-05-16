using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using eTPL.API.Data;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class DiscordService : IDiscordService
    {
        private readonly MsSqlDbContext _context;
        private readonly string _webhookUrl;
        private readonly HttpClient _httpClient;
        private readonly Random _random = new Random();

        // Fallback Templates (Clean Code)
        private const string DEFAULT_AUCTION_HEADLINE = "**OFFICIAL:** {team} ปิดดีลคว้า {player} ร่วมทัพ!";
        private const string DEFAULT_AUCTION_BODY = "👤 **ผู้คว้าตัว:** {team}\n⚽ **นักเตะ:** {player}\n💰 **ราคา:** {price} TP";
        private const string DEFAULT_TRANSFER_HEADLINE = "**TRANSFER:** {to} คว้าตัว {player} จาก {from} เรียบร้อย!";
        private const string DEFAULT_LOAN_HEADLINE = "**LOAN DEAL:** {to} ยืมตัว {player} จาก {from} ใช้งานชั่วคราว";
        private const string DEFAULT_TRANSFER_BODY = "👤 **ผู้ซื้อ:** {to}\n👤 **ผู้ขาย:** {from}\n⚽ **นักเตะ:** {player}\n💰 **ค่าตัว:** {price} TP";
        private const string DEFAULT_LOAN_BODY = "👤 **ผู้ยืม:** {to}\n👤 **เจ้าของ:** {from}\n⚽ **นักเตะ:** {player}\n💰 **ค่ายืม:** {price} TP";
        private const string DEFAULT_MARKET_HEADLINE = "**MARKET:** {team} ขึ้นบัญชีขาย {player} แล้ว!";
        private const string DEFAULT_MARKET_BODY = "👤 **ผู้ขาย:** {team}\n⚽ **นักเตะ:** {player}\n💰 **ราคาเริ่มต้น:** {price} TP";

        public DiscordService(IConfiguration configuration, MsSqlDbContext context)
        {
            _webhookUrl = configuration["Discord:WebhookUrl"] ?? string.Empty;
            _httpClient = new HttpClient();
            _context = context;
        }

        private async Task<string> GetRandomTemplateAsync(string category, string defaultTemplate)
        {
            try
            {
                var templates = await _context.NotificationTemplates
                    .Where(t => t.Category == category && t.IsActive && (t.TargetPlatform == "DISCORD" || t.TargetPlatform == "BOTH"))
                    .Select(t => t.TemplateText)
                    .ToListAsync();

                if (templates.Count > 0)
                {
                    return templates[_random.Next(templates.Count)];
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching template for {category}: {ex.Message}");
            }
            return defaultTemplate;
        }

        public async Task SendMatchResultAsync(string message, bool isEdit = false)
        {
            int color = isEdit ? 0xF1C40F : 0x2ECC71;
            string title = isEdit ? "MATCH RESULT UPDATED" : "MATCH RESULT";
            await SendCustomEmbedAsync(title, message, color);
        }

        public async Task SendAuctionConfirmAsync(string playerName, string teamName, int price, string? pesPlayerId = null)
        {
            string headlineTemplate = await GetRandomTemplateAsync("AUCTION_CONFIRM", DEFAULT_AUCTION_HEADLINE);
            
            string headline = headlineTemplate
                .Replace("{player}", playerName)
                .Replace("{team}", teamName)
                .Replace("{price}", price.ToString("N0"));

            string bodyText = DEFAULT_AUCTION_BODY
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
            string headlineCategory = isLoan ? "LOAN" : "TRANSFER";
            string defaultHeadline = isLoan ? DEFAULT_LOAN_HEADLINE : DEFAULT_TRANSFER_HEADLINE;
            
            string headlineTemplate = await GetRandomTemplateAsync(headlineCategory, defaultHeadline);
            string bodyTemplate = isLoan ? DEFAULT_LOAN_BODY : DEFAULT_TRANSFER_BODY;

            string headline = headlineTemplate
                .Replace("{player}", playerName)
                .Replace("{from}", fromTeam)
                .Replace("{to}", toTeam)
                .Replace("{price}", price.ToString("N0"));

            string bodyText = bodyTemplate
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
            string headlineTemplate = await GetRandomTemplateAsync("MARKET_LISTED", DEFAULT_MARKET_HEADLINE);

            string headline = headlineTemplate
                .Replace("{player}", playerName)
                .Replace("{team}", teamName)
                .Replace("{price}", price.ToString("N0"));
                
            string bodyText = DEFAULT_MARKET_BODY
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
