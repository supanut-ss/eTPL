using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class VFixture
{
    public string? Home { get; set; }

    public string? Away { get; set; }

    public int? HomeScore { get; set; }

    public int? AwayScore { get; set; }

    public string? Hname { get; set; }

    public string? HImage { get; set; }

    public string? AName { get; set; }

    public string? AImage { get; set; }

    public int? Match { get; set; }

    public string FixtureId { get; set; } = null!;

    public string? Active { get; set; }

    public string? Division { get; set; }

    public int? Season { get; set; }
}
