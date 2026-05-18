using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace eTPL.API.Models.DTOs
{
    public class LineWebhookRequest
    {
        [JsonPropertyName("events")]
        public List<LineEvent>? Events { get; set; } = new();
    }

    public class LineEvent
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("source")]
        public LineSource? Source { get; set; }

        [JsonPropertyName("replyToken")]
        public string? ReplyToken { get; set; }

        [JsonPropertyName("message")]
        public LineMessage? Message { get; set; }
    }

    public class LineSource
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("userId")]
        public string? UserId { get; set; }

        [JsonPropertyName("groupId")]
        public string? GroupId { get; set; }
    }

    public class LineMessage
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    public class LineReplyRequest
    {
        [JsonPropertyName("replyToken")]
        public string ReplyToken { get; set; } = null!;

        [JsonPropertyName("messages")]
        public List<object> Messages { get; set; } = new();
    }

    public class LineProfileResponse
    {
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = null!;

        [JsonPropertyName("pictureUrl")]
        public string? PictureUrl { get; set; }
    }
}
