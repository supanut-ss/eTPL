using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmHof
{
    public string HofId { get; set; } = null!;

    public string? Platform { get; set; }

    public double? Season { get; set; }

    public string? D1 { get; set; }

    public string? D2 { get; set; }

    public string? LeagueCup { get; set; }

    public string? FaCup { get; set; }

    public string? ThaiClubCup { get; set; }
}
