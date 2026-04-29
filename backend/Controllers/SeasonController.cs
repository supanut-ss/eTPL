using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eTPL.API.Services.Interfaces;
using eTPL.API.Models.DTOs;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class SeasonController : ControllerBase
    {
        private readonly IAuctionService _auctionService;

        public SeasonController(IAuctionService auctionService)
        {
            _auctionService = auctionService;
        }

        [HttpPost("close")]
        public async Task<IActionResult> CloseSeason([FromQuery] string platform = "PC", [FromQuery] string division = "D1")
        {
            var result = await _auctionService.CloseSeasonAsync(platform, division);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("open")]
        public async Task<IActionResult> OpenSeason([FromQuery] string platform = "PC", [FromQuery] string division = "D1")
        {
            var result = await _auctionService.OpenSeasonAsync(platform, division);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }
    }
}
