using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TblLeave
{
    public Guid LeaveId { get; set; }

    public string? Platform { get; set; }

    public string? UserId { get; set; }

    public string? UserName { get; set; }

    public string? DateFrom { get; set; }

    public string? DateTo { get; set; }

    public string? Reason { get; set; }
}
