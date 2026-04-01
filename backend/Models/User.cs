namespace eTPL.API.Models
{
    public class User
    {
        public int Id { get; set; }                          // id (auto-increment, unique)
        public string UserId { get; set; } = string.Empty;   // user_id (PK)
        public string Password { get; set; } = string.Empty;   // password (hashed)
        public string UserLevel { get; set; } = "user";        // user_level: "admin" | "user"
        public string? LineId { get; set; }                    // line_id
        public string? LinePic { get; set; }                   // line_pic
        public string? LineName { get; set; }                  // line_name
    }
}
