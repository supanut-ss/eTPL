using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class VFixtureAllLog
{
    public string FixtureId { get; set; } = null!;

    public string? Division { get; set; }

    public int? Match { get; set; }

    public string? Home { get; set; }

    public int? HomeScore { get; set; }

    public int? AwayScore { get; set; }

    public string? Away { get; set; }

    public string? Active { get; set; }

    public string? HomeImage { get; set; }

    public string? AwayImage { get; set; }

    public int? Season { get; set; }

    public string? HomeTeamName { get; set; }

    public string? AwayTeamName { get; set; }

    public string? Platform { get; set; }

    public DateTime? MatchDate { get; set; }

    public string? MatchDateDisplay { get; set; }

    public string ResultImage { get; set; } = null!;
}
