namespace eTPL.API.Models.DTOs
{
    public class PermissionDto
    {
        public string MenuKey { get; set; } = string.Empty;
        public string MenuLabel { get; set; } = string.Empty;
        public string UserLevel { get; set; } = string.Empty;
        public bool CanAccess { get; set; }
    }

    public class UpdatePermissionRequest
    {
        public string MenuKey { get; set; } = string.Empty;
        public string UserLevel { get; set; } = string.Empty;
        public bool CanAccess { get; set; }
    }

    // สำหรับ bulk update ทั้งหมดในครั้งเดียว
    public class BulkUpdatePermissionRequest
    {
        public List<UpdatePermissionRequest> Permissions { get; set; } = new();
    }
}
