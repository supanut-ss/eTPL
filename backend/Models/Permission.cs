namespace eTPL.API.Models
{
    public class Permission
    {
        public int Id { get; set; }             // id (PK, auto-increment)
        public string MenuKey { get; set; } = string.Empty;   // menu_key เช่น "users", "permissions"
        public string MenuLabel { get; set; } = string.Empty; // menu_label เช่น "จัดการผู้ใช้"
        public string UserLevel { get; set; } = string.Empty; // user_level: "admin" | "user"
        public bool CanAccess { get; set; } = false;          // can_access
    }
}
