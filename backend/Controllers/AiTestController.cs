using Microsoft.AspNetCore.Mvc;
using eTPL.API.Services.Interfaces;
using System.Threading.Tasks;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/ai")]
    public class AiTestController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiTestController(IAiService aiService)
        {
            _aiService = aiService;
        }

        [HttpGet("test-prompt")]
        public async Task<IActionResult> TestPrompt(string name, string team, string tournament)
        {
            var prompt = await _aiService.GenerateChampionPromptAsync(name, team, tournament);
            return Ok(new { prompt });
        }

        [HttpPost("generate-prompt")]
        public async Task<IActionResult> GeneratePrompt([FromBody] GeneratePromptRequest request)
        {
            var prompt = await _aiService.GeneratePromptByTypeAsync(request.Name, request.Team, request.Type);
            return Ok(new { prompt });
        }

        [HttpPost("generate-image")]
        public async Task<IActionResult> GenerateImage([FromBody] GenerateImageRequest request)
        {
            var imageUrl = await _aiService.GenerateChampionImageWithFaceAsync(request.Prompt, request.ImageUrls, request.Provider);
            return Ok(new { imageUrl });
        }

        [HttpPost("process-hof/{hofId}")]
        public async Task<IActionResult> ProcessHof(string hofId)
        {
            await _aiService.ProcessHofAiImageAsync(hofId);
            return Ok(new { message = "Processing started in background (check logs or DB)" });
        }
    }

    public class GeneratePromptRequest
    {
        public string Name { get; set; } = null!;
        public string Team { get; set; } = null!;
        public string Type { get; set; } = null!;
    }

    public class GenerateImageRequest
    {
        public string Prompt { get; set; } = null!;
        public List<string> ImageUrls { get; set; } = new();
        public string Provider { get; set; } = "Leonardo";
    }
}
