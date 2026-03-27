using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmPermission
{
    public int Id { get; set; }

    public string MenuKey { get; set; } = null!;

    public string MenuLabel { get; set; } = null!;

    public string UserLevel { get; set; } = null!;

    public bool CanAccess { get; set; }
}
