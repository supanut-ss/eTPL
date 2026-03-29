using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using eTPL.API.Data;
using eTPL.API.Models.DTOs;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly MsSqlDbContext _db;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public AuthService(MsSqlDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _db = db;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.UserId == request.UserId);

            if (user == null || user.Password != request.Password)
                return null;

            var token = GenerateJwtToken(user);

            return new LoginResponse
            {
                Token = token,
                User = new UserDto
                {
                    UserId = user.UserId,
                    UserLevel = user.UserLevel,
                    LineId = user.LineId,
                    LinePic = user.LinePic,
                    LineName = user.LineName,
                }
            };
        }

        public async Task<LoginResponse?> LineLoginAsync(LineLoginRequest request)
        {
            var channelId = _config["Line:ChannelId"] ?? throw new InvalidOperationException("LINE Channel ID not configured");
            var channelSecret = _config["Line:ChannelSecret"] ?? throw new InvalidOperationException("LINE Channel Secret not configured");

            var httpClient = _httpClientFactory.CreateClient();

            // Exchange authorization code for access token
            var tokenResponse = await httpClient.PostAsync(
                "https://api.line.me/oauth2/v2.1/token",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "authorization_code",
                    ["code"] = request.Code,
                    ["redirect_uri"] = request.RedirectUri,
                    ["client_id"] = channelId,
                    ["client_secret"] = channelSecret,
                })
            );

            if (!tokenResponse.IsSuccessStatusCode)
                return null;

            var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
            var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenJson);
            if (!tokenData.TryGetProperty("access_token", out var accessTokenElement))
                return null;

            var accessToken = accessTokenElement.GetString();
            if (string.IsNullOrEmpty(accessToken))
                return null;

            // Get LINE user profile
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var profileResponse = await httpClient.GetAsync("https://api.line.me/v2/profile");
            if (!profileResponse.IsSuccessStatusCode)
                return null;

            var profileJson = await profileResponse.Content.ReadAsStringAsync();
            var profile = JsonSerializer.Deserialize<JsonElement>(profileJson);
            if (!profile.TryGetProperty("userId", out var lineUserIdElement))
                return null;

            var lineUserId = lineUserIdElement.GetString();
            if (string.IsNullOrEmpty(lineUserId))
                return null;

            // Look up user by line_id
            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.LineId == lineUserId);

            if (user == null)
                return null;

            var jwtToken = GenerateJwtToken(user);

            return new LoginResponse
            {
                Token = jwtToken,
                User = new UserDto
                {
                    UserId = user.UserId,
                    UserLevel = user.UserLevel,
                    LineId = user.LineId,
                    LinePic = user.LinePic,
                    LineName = user.LineName,
                }
            };
        }

        private string GenerateJwtToken(eTPL.API.Models.User user)
        {
            var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId),
                new Claim(ClaimTypes.Name, user.UserId),
                new Claim(ClaimTypes.Role, user.UserLevel),
            };

            var expireHours = int.Parse(_config["Jwt:ExpireHours"] ?? "8");
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expireHours),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
