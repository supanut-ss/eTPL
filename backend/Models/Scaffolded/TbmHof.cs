using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmHof
{
    public string HofId { get; set; } = null!;

    public string? Platform { get; set; }

    public string? Season { get; set; }

    public string? TournamentTitle { get; set; }

    public string? TournamentSubtitle { get; set; }

    public string? WinnerName { get; set; }

    public string? WinnerTeam { get; set; }

    public string? RunnerUpName { get; set; }

    public string? WinnerImage { get; set; }

    public string? DisplayColor { get; set; }
}
