using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmFixtureAll
{
    public string FixtureId { get; set; } = null!;

    public string? Division { get; set; }

    public int? Match { get; set; }

    public string? Home { get; set; }

    public int? HomeScore { get; set; }

    public int? AwayScore { get; set; }

    public string? Away { get; set; }

    public string? Active { get; set; }

    public int? Season { get; set; }

    public DateTime? MatchDate { get; set; }

    public string? Platform { get; set; }

    public int? Leg { get; set; }

    public int? HomeYellow { get; set; }

    public int? HomeRed { get; set; }

    public int? AwayYellow { get; set; }

    public int? AwayRed { get; set; }
}
