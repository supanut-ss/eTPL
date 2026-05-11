using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace eTPL.API.Controllers
{
    /// <summary>
    /// Proxies external images server-side to bypass hotlink protection and CORS restrictions.
    /// This allows html2canvas and the browser to display images from pesdb.net, pesmaster.com, etc.
    /// </summary>
    [ApiController]
    [Route("api/image-proxy")]
    public class ImageProxyController : ControllerBase
    {
        private static readonly HashSet<string> AllowedHosts = new(StringComparer.OrdinalIgnoreCase)
        {
            "pesdb.net",
            "www.pesdb.net",
            "pesmaster.com",
            "www.pesmaster.com",
            "ui-avatars.com",
            // LINE profile picture CDNs
            "profile.line-scdn.net",
            "obs.line-scdn.net",
            "sprofile.line-scdn.net",
            // Our own production domain
            "thaipesleague.com",
            "www.thaipesleague.com",
        };

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ImageProxyController> _logger;

        public ImageProxyController(IHttpClientFactory factory, IMemoryCache cache, ILogger<ImageProxyController> logger)
        {
            _http = factory.CreateClient("image-proxy");
            _cache = cache;
            _logger = logger;
        }

        [HttpGet]
        [ResponseCache(Duration = 86400)] // Cache at HTTP level for 1 day
        public async Task<IActionResult> Proxy([FromQuery] string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest("Missing url parameter.");

            // Validate the URL
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                (uri.Scheme != "http" && uri.Scheme != "https"))
                return BadRequest("Invalid URL.");

            // Whitelist check — only allow trusted image hosts
            if (!AllowedHosts.Contains(uri.Host))
            {
                _logger.LogWarning("[ImageProxy] Blocked request to untrusted host: {Host}", uri.Host);
                return StatusCode(403, $"Host '{uri.Host}' is not allowed.");
            }

            var cacheKey = $"img:{url}";
            if (_cache.TryGetValue(cacheKey, out byte[]? cached) && cached != null)
            {
                var contentType = _cache.Get<string>($"ct:{url}") ?? "image/png";
                Response.Headers["Access-Control-Allow-Origin"] = "*";
                Response.Headers["Cache-Control"] = "public, max-age=86400";
                return File(cached, contentType);
            }

            try
            {
                var response = await _http.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[ImageProxy] Upstream returned {Status} for {Url}", (int)response.StatusCode, url);
                    return StatusCode((int)response.StatusCode, "Upstream image not found.");
                }

                var imageBytes = await response.Content.ReadAsByteArrayAsync();
                var ct = response.Content.Headers.ContentType?.MediaType ?? "image/png";

                // Cache in memory for 1 day
                var cacheOptions = new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromDays(1));
                _cache.Set(cacheKey, imageBytes, cacheOptions);
                _cache.Set($"ct:{url}", ct, cacheOptions);

                Response.Headers["Access-Control-Allow-Origin"] = "*";
                Response.Headers["Cache-Control"] = "public, max-age=86400";
                return File(imageBytes, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ImageProxy] Failed to fetch {Url}", url);
                return StatusCode(502, "Failed to fetch image from upstream.");
            }
        }
    }
}
