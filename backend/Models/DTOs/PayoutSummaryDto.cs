namespace eTPL.API.Models.DTOs
{
    public class PayoutSummaryDto
    {
        public string UserId { get; set; } = null!;
        public string DisplayName { get; set; } = null!;
        public int Amount { get; set; }
        public string Tier { get; set; } = null!;
        public bool AlreadyPaid { get; set; }
    }
}
