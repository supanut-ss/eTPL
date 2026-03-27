using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class VCurrentTeam
{
    public string Id { get; set; } = null!;

    public string? TeamName { get; set; }

    public string? Player { get; set; }

    public string? Division { get; set; }

    public string? Image { get; set; }

    public int? Season { get; set; }

    public int? TeamId { get; set; }

    public int? Overall { get; set; }

    public string? Md5TeamId { get; set; }

    public int? UserId { get; set; }

    public string? Platform { get; set; }
}
