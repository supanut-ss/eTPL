using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class InsertUser
{
    public string? Player { get; set; }

    public string? Expr1 { get; set; }

    public int? TeamId { get; set; }

    public string Expr2 { get; set; } = null!;

    public string Expr3 { get; set; } = null!;

    public int Expr4 { get; set; }
}
