namespace eTPL.API.Models.Auction
{
    public class SpecialBonus
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? ApprovedAt { get; set; }
        public string? ApprovedBy { get; set; }
        
        // Navigation
        public User? User { get; set; }
    }
}
