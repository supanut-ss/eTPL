using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmUser
{
    public string UserId { get; set; } = null!;

    public string Password { get; set; } = null!;

    public string UserLevel { get; set; } = null!;

    public string? LineId { get; set; }

    public string? LinePic { get; set; }

    public string? LineName { get; set; }
}
