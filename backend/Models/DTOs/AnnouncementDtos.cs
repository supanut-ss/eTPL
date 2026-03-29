using System;

namespace eTPL.API.Models.DTOs
{
    public class AnnouncementDto
    {
        public Guid Id { get; set; }
        public string Announcement { get; set; } = string.Empty;
        public string Announcer { get; set; } = string.Empty;
        public DateTime? CreateDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateAnnouncementRequest
    {
        public string Announcement { get; set; } = string.Empty;
        public string? Announcer { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateAnnouncementRequest
    {
        public string Announcement { get; set; } = string.Empty;
        public string? Announcer { get; set; }
        public bool IsActive { get; set; }
    }

    public class ToggleAnnouncementRequest
    {
        public bool IsActive { get; set; }
    }
}
