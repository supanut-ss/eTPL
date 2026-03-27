using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class VHof
{
    public string HofId { get; set; } = null!;

    public string? Platform { get; set; }

    public double? Season { get; set; }

    public string? D1 { get; set; }

    public string? D2 { get; set; }

    public string? LeagueCup { get; set; }

    public string? FaCup { get; set; }

    public string? ThaiClubCup { get; set; }

    public string? D1Image { get; set; }

    public string? D2Image { get; set; }

    public string? LcImage { get; set; }

    public string? FaImage { get; set; }

    public string? ThImage { get; set; }

    public string? SeasonImage { get; set; }
}
