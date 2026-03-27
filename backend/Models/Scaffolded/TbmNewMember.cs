using System;
using System.Collections.Generic;

namespace eTPL.API.Models.Scaffolded;

public partial class TbmNewMember
{
    public Guid Id { get; set; }

    public string? MemberId { get; set; }

    public string? MemberName { get; set; }

    public string? MemberImage { get; set; }

    public string? Platform { get; set; }

    public string? Facebook { get; set; }
}
