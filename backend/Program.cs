using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using eTPL.API.Data;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Services;
using eTPL.API.Services.Interfaces;
using eTPL.API.Middleware;
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

// ── MS SQL DbContext
builder.Services.AddDbContext<MsSqlDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MsSql"), sqlOptions => {
        sqlOptions.UseCompatibilityLevel(120);
        sqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
    }));

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
builder.Services.AddHttpClient("image-proxy", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    client.DefaultRequestHeaders.Add("Accept", "image/webp,image/apng,image/*,*/*;q=0.8");
    client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
    // Don't set Referer — absence of Referer often bypasses hotlink checks better than a wrong Referer
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddMemoryCache();

// ── Services (DI)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IAuctionService, AuctionService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<IDiscordService, DiscordService>();
builder.Services.AddScoped<IFacebookService, FacebookService>();
builder.Services.AddHttpClient<LineWebhookService>();
builder.Services.AddScoped<LineWebhookService>();


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

