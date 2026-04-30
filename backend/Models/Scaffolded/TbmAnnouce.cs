using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmAnnouce
{
    public Guid Id { get; set; }

    public string? Announcer { get; set; }

    public string? Announcement { get; set; }

    public DateTime? CreateDate { get; set; }

    public string? Platform { get; set; }
    public string? ImageUrl { get; set; }
}
