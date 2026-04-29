using Microsoft.AspNetCore.Mvc;
using eTPL.API.Services.Interfaces;
using System.Threading.Tasks;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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

        [HttpPost("process-hof/{hofId}")]
        public async Task<IActionResult> ProcessHof(string hofId)
        {
            await _aiService.ProcessHofAiImageAsync(hofId);
            return Ok(new { message = "Processing started in background (check logs or DB)" });
        }
    }
}
