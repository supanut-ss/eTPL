namespace eTPL.API.Models.DTOs;

public class ReportResultDto
{
    public int HomeScore { get; set; }
    public int AwayScore { get; set; }
    public int HomeYellow { get; set; } = 0;
    public int HomeRed { get; set; } = 0;
    public int AwayYellow { get; set; } = 0;
    public int AwayRed { get; set; } = 0;
}
