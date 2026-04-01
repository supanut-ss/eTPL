namespace eTPL.API.Models.Auction
{
    public class AuctionGradeQuota
    {
        public int GradeId { get; set; }
        public string GradeName { get; set; } = string.Empty;
        public int MinOVR { get; set; }
        public int MaxOVR { get; set; }
        public int MaxAllowedPerUser { get; set; }
    }
}
