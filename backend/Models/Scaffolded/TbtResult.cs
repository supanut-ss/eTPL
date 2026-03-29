using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbtResult
{
    public string Id { get; set; } = null!;

    public string? Division { get; set; }

    public string? Team { get; set; }

    public int? Pl { get; set; }

    public int? W { get; set; }

    public int? D { get; set; }

    public int? L { get; set; }

    public int? Ga { get; set; }

    public int? Gf { get; set; }

    public int? Gd { get; set; }

    public int? Pts { get; set; }

    public DateTime? CreateDate { get; set; }

    public int? Season { get; set; }

    public string? FixtureId { get; set; }

    public string? Platform { get; set; }

    public int? Yellow { get; set; }

    public int? Red { get; set; }
}
