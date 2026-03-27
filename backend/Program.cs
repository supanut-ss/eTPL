using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using eTPL.API.Data;
using eTPL.API.Middleware;
using eTPL.API.Services;
using eTPL.API.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers
builder.Services.AddControllers();

// ── CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ── MS SQL DbContext (Users + Business Data)
builder.Services.AddDbContext<MsSqlDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MsSql")));

// ── MySQL DbContext (สำรองไว้ถ้ามีใช้ในอนาคต)
// var mySqlConn = builder.Configuration.GetConnectionString("MySql");
// builder.Services.AddDbContext<MySqlDbContext>(options =>
//     options.UseMySql(mySqlConn, ServerVersion.AutoDetect(mySqlConn)));

// ── JWT Authentication
var jwtConfig = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtConfig["Key"]!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtConfig["Issuer"],
            ValidAudience = jwtConfig["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key),
        };
    });

builder.Services.AddAuthorization();

// ── Services (DI)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

// ── Middleware Pipeline
app.UseMiddleware<ExceptionMiddleware>();

app.UseCors("AllowFrontend");

// Serve React static files (production)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback — ทุก route ที่ไม่ใช่ /api/ ให้ return index.html
app.MapFallbackToFile("index.html");

app.Run();

