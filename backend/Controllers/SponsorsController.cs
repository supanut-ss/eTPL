using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.DTOs;

namespace eTPL.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SponsorsController : ControllerBase
    {
        private readonly MsSqlDbContext _context;

        public SponsorsController(MsSqlDbContext context)
        {
            _context = context;
        }

        // GET api/sponsors (Public)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var sponsors = await _context.Sponsors
                .OrderBy(s => s.DisplayOrder)
                .ThenBy(s => s.Name)
                .ToListAsync();
            return Ok(ApiResponse<IEnumerable<Sponsor>>.Ok(sponsors));
        }

        // GET api/sponsors/{id} (Public)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var sponsor = await _context.Sponsors.FindAsync(id);
            if (sponsor == null) 
                return NotFound(ApiResponse<object>.Fail("ไม่พบข้อมูลผู้สนับสนุน"));
            return Ok(ApiResponse<Sponsor>.Ok(sponsor));
        }

        // POST api/sponsors (Admin & Moderator only)
        [HttpPost]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Create([FromBody] SponsorDto dto)
        {
            if (!ModelState.IsValid) 
                return BadRequest(ApiResponse<object>.Fail("ข้อมูลไม่ถูกต้อง"));

            var sponsor = new Sponsor
            {
                Name = dto.Name,
                Logo = dto.Logo,
                Tagline = dto.Tagline,
                Description = dto.Description,
                Website = dto.Website,
                BannerBg = dto.BannerBg,
                BrandColor = dto.BrandColor,
                HasBanner = dto.HasBanner,
                DisplayOrder = dto.DisplayOrder
            };

            _context.Sponsors.Add(sponsor);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
            {
                var detail = dbEx.InnerException?.Message ?? dbEx.Message;
                return StatusCode(500, ApiResponse<object>.Fail($"บันทึกไม่สำเร็จ: {detail}"));
            }

            return CreatedAtAction(nameof(GetById), new { id = sponsor.Id }, ApiResponse<Sponsor>.Ok(sponsor, "เพิ่มผู้สนับสนุนสำเร็จ"));
        }

        // PUT api/sponsors/{id} (Admin & Moderator only)
        [HttpPut("{id}")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Update(int id, [FromBody] SponsorDto dto)
        {
            if (!ModelState.IsValid) 
                return BadRequest(ApiResponse<object>.Fail("ข้อมูลไม่ถูกต้อง"));

            var sponsor = await _context.Sponsors.FindAsync(id);
            if (sponsor == null) 
                return NotFound(ApiResponse<object>.Fail("ไม่พบข้อมูลผู้สนับสนุน"));

            sponsor.Name = dto.Name;
            sponsor.Logo = dto.Logo;
            sponsor.Tagline = dto.Tagline;
            sponsor.Description = dto.Description;
            sponsor.Website = dto.Website;
            sponsor.BannerBg = dto.BannerBg;
            sponsor.BrandColor = dto.BrandColor;
            sponsor.HasBanner = dto.HasBanner;
            sponsor.DisplayOrder = dto.DisplayOrder;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
            {
                var detail = dbEx.InnerException?.Message ?? dbEx.Message;
                return StatusCode(500, ApiResponse<object>.Fail($"บันทึกไม่สำเร็จ: {detail}"));
            }
            return Ok(ApiResponse<Sponsor>.Ok(sponsor, "แก้ไขข้อมูลผู้สนับสนุนสำเร็จ"));
        }

        // DELETE api/sponsors/{id} (Admin & Moderator only)
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Delete(int id)
        {
            var sponsor = await _context.Sponsors.FindAsync(id);
            if (sponsor == null) 
                return NotFound(ApiResponse<object>.Fail("ไม่พบข้อมูลผู้สนับสนุน"));

            _context.Sponsors.Remove(sponsor);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<string>.Ok("ลบข้อมูลผู้สนับสนุนสำเร็จ"));
        }
    }
}
