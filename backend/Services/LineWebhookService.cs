using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using eTPL.API.Models.DTOs;

namespace eTPL.API.Services
{
    public class LineWebhookService
    {
        private readonly HttpClient _httpClient;
        private readonly string _accessToken;

        public LineWebhookService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _accessToken = configuration["LineBot:ChannelAccessToken"] ?? "";
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
    }
}
