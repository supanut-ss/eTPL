using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;
using Microsoft.AspNetCore.Authorization;

namespace eTPL.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationTemplateController : ControllerBase
    {
        private readonly MsSqlDbContext _context;

        public NotificationTemplateController(MsSqlDbContext context)
        {
            _context = context;
        }

        // GET: api/NotificationTemplate
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<NotificationTemplate>>> GetTemplates([FromQuery] string? platform)
        {
            var query = _context.NotificationTemplates.Where(t => t.IsActive);
            
            if (!string.IsNullOrEmpty(platform))
            {
                query = query.Where(t => t.TargetPlatform == platform || t.TargetPlatform == "BOTH");
            }

            return await query.ToListAsync();
        }

        // POST: api/NotificationTemplate
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<NotificationTemplate>> PostTemplate(NotificationTemplate template)
        {
            _context.NotificationTemplates.Add(template);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTemplates), new { id = template.Id }, template);
        }

        // PUT: api/NotificationTemplate/5
        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> PutTemplate(int id, NotificationTemplate template)
        {
            if (id != template.Id) return BadRequest();

            _context.Entry(template).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TemplateExists(id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/NotificationTemplate/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteTemplate(int id)
        {
            var template = await _context.NotificationTemplates.FindAsync(id);
            if (template == null) return NotFound();

            _context.NotificationTemplates.Remove(template);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool TemplateExists(int id)
        {
            return _context.NotificationTemplates.Any(e => e.Id == id);
        }
    }
}
