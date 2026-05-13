using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace eTPL.API.Models.DTOs
{
    public class LineWebhookRequest
    {
        public List<LineEvent> Events { get; set; } = new();
    }

    public class LineEvent
    {
        public string Type { get; set; } = null!;
        public LineSource Source { get; set; } = null!;
        public string ReplyToken { get; set; } = null!;
        public LineMessage? Message { get; set; }
    }

    public class LineSource
    {
        public string Type { get; set; } = null!;
        public string? UserId { get; set; }
        public string? GroupId { get; set; }
    }

    public class LineMessage
    {
        public string Type { get; set; } = null!;
        public string? Text { get; set; }
    }

    public class LineReplyRequest
    {
        public string ReplyToken { get; set; } = null!;
        public List<object> Messages { get; set; } = new();
    }

    public class LineProfileResponse
    {
        public string DisplayName { get; set; } = null!;
        public string? PictureUrl { get; set; }
    }
}
