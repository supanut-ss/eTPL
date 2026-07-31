using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using eTPL.API.Models.DTOs;
using eTPL.API.Models.Scaffolded;


namespace eTPL.API.Services
{
    public class LineWebhookService
    {
        private readonly HttpClient _httpClient;
        private readonly string _accessToken;

        public bool IsTokenConfigured => !string.IsNullOrEmpty(_accessToken);

        public LineWebhookService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            // Check multiple possible keys
            _accessToken = configuration["LineBot:ChannelAccessToken"] 
                        ?? configuration["Line:ChannelAccessToken"] 
                        ?? configuration["LINE_CHANNEL_ACCESS_TOKEN"]
                        ?? "";
            
            if (string.IsNullOrEmpty(_accessToken))
            {
                Console.WriteLine("CRITICAL: LINE ChannelAccessToken is MISSING in configuration!");
            }
            else
            {
                Console.WriteLine($"LINE ChannelAccessToken loaded (Prefix: {(_accessToken.Length > 10 ? _accessToken.Substring(0, 10) : "...")})");
            }
        }

        public async Task<LineProfileResponse?> GetUserProfileAsync(string userId)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.line.me/v2/bot/profile/{userId}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return null;

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<LineProfileResponse>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }

        public async Task ReplyMessageAsync(string replyToken, List<object> messages)
        {
            var url = "https://api.line.me/v2/bot/message/reply";
            var payload = new LineReplyRequest
            {
                ReplyToken = replyToken,
                Messages = messages
            };

            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"LINE Reply Error: {error}");
            }
        }

        public object GetCheckInFlexMessage(string userName, string pictureUrl, string datetime)
        {
            return new
            {
                type = "flex",
                altText = "รายงานตัวสำเร็จ",
                contents = new
                {
                    type = "carousel",
                    contents = new object[]
                    {
                        new
                        {
                            type = "bubble",
                            size = "hecto",
                            body = new
                            {
                                type = "box",
                                layout = "vertical",
                                paddingAll = "0px",
                                contents = new object[]
                                {
                                    new
                                    {
                                        type = "image",
                                        url = !string.IsNullOrEmpty(pictureUrl) ? pictureUrl : "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png",
                                        size = "full",
                                        aspectMode = "cover",
                                        aspectRatio = "2:3",
                                        gravity = "top"
                                    },
                                    new
                                    {
                                        type = "box",
                                        layout = "vertical",
                                        position = "absolute",
                                        offsetBottom = "0px",
                                        offsetStart = "0px",
                                        offsetEnd = "0px",
                                        backgroundColor = "#ff9913cc",
                                        paddingAll = "20px",
                                        paddingTop = "18px",
                                        contents = new object[]
                                        {
                                            new
                                            {
                                                type = "box",
                                                layout = "vertical",
                                                contents = new object[]
                                                {
                                                    new
                                                    {
                                                        type = "text",
                                                        text = userName,
                                                        size = "xl",
                                                        color = "#ffffff",
                                                        weight = "bold"
                                                    },
                                                    new
                                                    {
                                                        type = "text",
                                                        text = datetime,
                                                        size = "xxs",
                                                        color = "#ffffff",
                                                        weight = "bold"
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    new
                                    {
                                        type = "box",
                                        layout = "vertical",
                                        position = "absolute",
                                        cornerRadius = "20px",
                                        offsetTop = "18px",
                                        backgroundColor = "#ff9913",
                                        offsetStart = "18px",
                                        height = "25px",
                                        width = "53px",
                                        contents = new object[]
                                        {
                                            new
                                            {
                                                type = "text",
                                                text = "Ready",
                                                color = "#ffffff",
                                                align = "center",
                                               size = "xs",
                                                offsetTop = "3px"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
        }

        public object GetFixtureFlexMessage(string userId, string userName, string division, int? season, List<VFixtureAll> fixtures, string? userTeam)
        {
            var headerContents = new List<object>();
            var bodyContents = new List<object>();

            string userLogo = string.IsNullOrEmpty(userTeam)
                ? "https://thaipesleague.com/_image/CLUB_LOGO/WE%20UNITED.PNG"
                : $"https://thaipesleague.com/_image/CLUB_LOGO/{Uri.EscapeDataString(userTeam)}.png";

            // Header Section
            headerContents.Add(new
            {
                type = "box",
                layout = "horizontal",
                alignItems = "center",
                contents = new object[]
                {
                    new
                    {
                        type = "box",
                        layout = "vertical",
                        flex = 1,
                        contents = new object[]
                        {
                            new
                            {
                                type = "text",
                                text = userName.ToUpper(),
                                weight = "bold",
                                size = "lg",
                                color = "#FFFFFF"
                            },
                            new
                            {
                                type = "text",
                                text = division,
                                size = "xs",
                                color = "#38BDF8",
                                weight = "bold",
                                margin = "xs"
                            }
                        }
                    },
                    new
                    {
                        type = "image",
                        url = userLogo,
                        size = "32px",
                        aspectMode = "fit",
                        flex = 0
                    }
                }
            });

            foreach (var f in fixtures)
            {
                bool isHome = string.Equals(f.Home, userId, StringComparison.OrdinalIgnoreCase);
                string opponentUser = isHome ? (f.Away ?? "TBD") : (f.Home ?? "TBD");
                string opponentTeam = isHome ? (f.AwayTeamName ?? "TBD") : (f.HomeTeamName ?? "TBD");
                string venueSuffix = isHome ? "(H)" : "(A)";
                bool isPlayed = f.HomeScore != null && f.AwayScore != null;

                string opponentLogo = string.IsNullOrEmpty(opponentTeam) || opponentTeam == "TBD"
                    ? "https://thaipesleague.com/_image/CLUB_LOGO/WE%20UNITED.PNG"
                    : $"https://thaipesleague.com/_image/CLUB_LOGO/{Uri.EscapeDataString(opponentTeam)}.png";

                var spans = new List<object>();

                if (isPlayed)
                {
                    int? userScore = isHome ? f.HomeScore : f.AwayScore;
                    int? opponentScore = isHome ? f.AwayScore : f.HomeScore;

                    spans.Add(new { type = "span", text = opponentUser, color = "#64748B", weight = "regular" });
                    spans.Add(new { type = "span", text = " " });
                    spans.Add(new { type = "span", text = venueSuffix, color = "#475569", weight = "regular" });
                    spans.Add(new { type = "span", text = "   " });
                    spans.Add(new { type = "span", text = $"[{userScore} - {opponentScore}]", color = "#F59E0B", weight = "bold" });
                }
                else
                {
                    string venueColor = isHome ? "#10B981" : "#FB923C";
                    spans.Add(new { type = "span", text = opponentUser, color = "#FFFFFF", weight = "bold" });
                    spans.Add(new { type = "span", text = " " });
                    spans.Add(new { type = "span", text = venueSuffix, color = venueColor, weight = "bold" });
                }

                bodyContents.Add(new
                {
                    type = "box",
                    layout = "horizontal",
                    alignItems = "center",
                    margin = "md",
                    contents = new object[]
                    {
                        new
                        {
                            type = "text",
                            text = $"M{f.Match}",
                            size = "sm",
                            color = "#38BDF8",
                            weight = "bold",
                            flex = 1
                        },
                        new
                        {
                            type = "image",
                            url = opponentLogo,
                            size = "22px",
                            aspectMode = "fit",
                            flex = 0
                        },
                        new
                        {
                            type = "text",
                            size = "sm",
                            margin = "sm",
                            flex = 5,
                            contents = spans.ToArray()
                        }
                    }
                });
            }

            return new
            {
                type = "flex",
                altText = $"โปรแกรมการแข่งขันของ {userName}",
                contents = new
                {
                    type = "bubble",
                    size = "kilo",
                    header = new
                    {
                        type = "box",
                        layout = "vertical",
                        paddingAll = "16px",
                        background = new
                        {
                            type = "linearGradient",
                            angle = "135deg",
                            startColor = "#0B1329",
                            endColor = "#111B38"
                        },
                        contents = headerContents.ToArray()
                    },
                    body = new
                    {
                        type = "box",
                        layout = "vertical",
                        paddingAll = "16px",
                        spacing = "md",
                        background = new
                        {
                            type = "linearGradient",
                            angle = "135deg",
                            startColor = "#131E3A",
                            endColor = "#1A2544"
                        },
                        contents = bodyContents.ToArray()
                    }
                }
            };
        }
    }
}

