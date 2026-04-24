using System;

namespace eTPL.API.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public int UserId { get; set; } // Receiver (FK to User.id)
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? TargetUrl { get; set; }
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual User? User { get; set; }
    }
}
