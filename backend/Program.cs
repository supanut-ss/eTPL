using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using eTPL.API.Data;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Middleware;
using eTPL.API.Services;
using eTPL.API.Services.Interfaces;
using eTPL.API.Hubs;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Force all DateTime to serialize with "Z" (UTC) so frontend parses correctly
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddSignalR();

// ── CORS
builder.Services.AddCors(options =>
{
    // Origins can be configured in appsettings.json under "Cors:AllowedOrigins".
    // Always include localhost dev origins in Development, even when production
    // origins are configured in appsettings.
    var configuredOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>();

    var devOrigins = new[] { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000" };
    var fallbackOrigins = new[]
    {
        "https://thaipesleague.com",
        "https://www.thaipesleague.com",
        "https://apicore.thaipesleague.com",
        "http://thaipesleague.com",
        "http://www.thaipesleague.com",
    };

    var allowedOrigins = (configuredOrigins?.Length > 0 ? configuredOrigins : fallbackOrigins)
        .Concat(builder.Environment.IsDevelopment() ? devOrigins : Array.Empty<string>())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── MS SQL DbContext (Users + Business Data)
builder.Services.AddDbContext<MsSqlDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MsSql"), sqlOptions => {
        sqlOptions.UseCompatibilityLevel(120);
        sqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
    }));

// ── Scaffolded DbContext (ใช้ connection string เดียวกัน)
builder.Services.AddDbContext<ScaffoldedDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MsSql"), sqlOptions => {
        sqlOptions.UseCompatibilityLevel(120);
        sqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
    }));

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
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

// ── Services (DI)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IAuctionService, AuctionService>();

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
app.MapHub<AuctionHub>("/hubs/auction");

// SPA fallback — ทุก route ที่ไม่ใช่ /api/ ให้ return index.html
app.MapFallbackToFile("index.html");

app.Run();

