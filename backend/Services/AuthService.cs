using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IMemoryCache _memoryCache;

        public AuthService(MsSqlDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory, IMemoryCache memoryCache)
        {
            _db = db;
            _config = config;
            _httpClientFactory = httpClientFactory;
            _memoryCache = memoryCache;
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
                    Id = user.Id,
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
            var lineAuth = await LineAuthAsync(request);
            return lineAuth?.Login;
        }

        public async Task<LineAuthResponse?> LineAuthAsync(LineLoginRequest request)
        {
            var profile = await GetLineProfileAsync(request);
            if (profile == null)
                return null;

            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.LineId == profile.LineId);

            if (user != null)
            {
                return new LineAuthResponse
                {
                    IsLinked = true,
                    Login = ToLoginResponse(user),
                };
            }

            var bindToken = Guid.NewGuid().ToString("N");
            _memoryCache.Set(bindToken, new LineBindContext
            {
                LineId = profile.LineId,
                DisplayName = profile.DisplayName,
                PictureUrl = profile.PictureUrl,
            }, TimeSpan.FromMinutes(10));

            var availableUsers = await GetLineAvailableUsersAsync();

            return new LineAuthResponse
            {
                IsLinked = false,
                BindToken = bindToken,
                LineProfile = profile,
                AvailableUsers = availableUsers.ToList(),
            };
        }

        public async Task<IEnumerable<LineAvailableUserDto>> GetLineAvailableUsersAsync()
        {
            return await _db.Users
                .Where(u => string.IsNullOrEmpty(u.LineId) && u.UserLevel != "admin")
                .OrderBy(u => u.UserId)
                .Select(u => new LineAvailableUserDto
                {
                    UserId = u.UserId,
                    UserLevel = u.UserLevel,
                })
                .ToListAsync();
        }

        public async Task<LoginResponse?> BindLineAccountAsync(LineBindRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BindToken) || string.IsNullOrWhiteSpace(request.UserId))
                return null;

            if (!_memoryCache.TryGetValue<LineBindContext>(request.BindToken, out var context) || context == null)
                return null;

            var alreadyMapped = await _db.Users.AnyAsync(u => u.LineId == context.LineId);
            if (alreadyMapped)
            {
                _memoryCache.Remove(request.BindToken);
                return null;
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == request.UserId);
            if (user == null || !string.IsNullOrEmpty(user.LineId) || user.UserLevel == "admin")
                return null;

            user.LineId = context.LineId;
            user.LineName = context.DisplayName;
            user.LinePic = context.PictureUrl;

            await _db.SaveChangesAsync();
            _memoryCache.Remove(request.BindToken);

            return ToLoginResponse(user);
        }

        public string GetLineAuthorizeUrl(string redirectUri, string state)
        {
            var (channelId, _) = GetLineCredentials();

            if (string.IsNullOrWhiteSpace(redirectUri))
                throw new ArgumentException("Redirect URI is required", nameof(redirectUri));

            if (string.IsNullOrWhiteSpace(state))
                throw new ArgumentException("State is required", nameof(state));

            var encodedRedirectUri = Uri.EscapeDataString(redirectUri);
            var encodedState = Uri.EscapeDataString(state);

            return $"https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id={channelId}&redirect_uri={encodedRedirectUri}&state={encodedState}&scope=profile";
        }

        private (string ChannelId, string ChannelSecret) GetLineCredentials()
        {
            var channelId = FirstConfiguredValue(
                "Line:ChannelId",
                "LineLogin:ChannelId",
                "LINE__CHANNELID",
                "LINE_CHANNELID",
                "LINE_CHANNEL_ID",
                "VITE_LINE_CHANNEL_ID");

            var channelSecret = FirstConfiguredValue(
                "Line:ChannelSecret",
                "LineLogin:ChannelSecret",
                "LINE__CHANNELSECRET",
                "LINE_CHANNELSECRET",
                "LINE_CHANNEL_SECRET");

            if (string.IsNullOrWhiteSpace(channelId) || channelId == "YOUR_LINE_CHANNEL_ID")
                throw new InvalidOperationException("LINE Channel ID not configured");

            if (string.IsNullOrWhiteSpace(channelSecret) || channelSecret == "YOUR_LINE_CHANNEL_SECRET")
                throw new InvalidOperationException("LINE Channel Secret not configured");

            return (channelId, channelSecret);
        }

        private string? FirstConfiguredValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = _config[key];
                if (string.IsNullOrWhiteSpace(value))
                    continue;

                if (value == "YOUR_LINE_CHANNEL_ID" || value == "YOUR_LINE_CHANNEL_SECRET")
                    continue;

                if (!string.IsNullOrWhiteSpace(value))
                    return value;
            }

            return null;
        }

        private async Task<LineProfileDto?> GetLineProfileAsync(LineLoginRequest request)
        {
            var (channelId, channelSecret) = GetLineCredentials();
            var httpClient = _httpClientFactory.CreateClient();

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

            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var profileResponse = await httpClient.GetAsync("https://api.line.me/v2/profile");
            if (!profileResponse.IsSuccessStatusCode)
                return null;

            var profileJson = await profileResponse.Content.ReadAsStringAsync();
            var profileData = JsonSerializer.Deserialize<JsonElement>(profileJson);
            if (!profileData.TryGetProperty("userId", out var lineUserIdElement))
                return null;

            var lineUserId = lineUserIdElement.GetString();
            if (string.IsNullOrEmpty(lineUserId))
                return null;

            var displayName = profileData.TryGetProperty("displayName", out var displayNameElement)
                ? displayNameElement.GetString()
                : null;

            var pictureUrl = profileData.TryGetProperty("pictureUrl", out var pictureUrlElement)
                ? pictureUrlElement.GetString()
                : null;

            return new LineProfileDto
            {
                LineId = lineUserId,
                DisplayName = displayName,
                PictureUrl = pictureUrl,
            };
        }

        private LoginResponse ToLoginResponse(eTPL.API.Models.User user)
        {
            var jwtToken = GenerateJwtToken(user);

            return new LoginResponse
            {
                Token = jwtToken,
                User = new UserDto
                {
                    Id = user.Id,
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
