using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
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

        public AuthService(MsSqlDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
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
