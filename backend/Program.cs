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
builder.Services.AddHostedService<AuctionSweepHostedService>();


var app = builder.Build();

// ── Database Initialization (Auto-Create tbs_sponsor & Seed initial data)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<MsSqlDbContext>();
    try
    {
        var sql = @"
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbs_sponsor' and xtype='U')
            BEGIN
                CREATE TABLE [dbo].[tbs_sponsor] (
                    [id] INT IDENTITY(1,1) NOT NULL,
                    [name] NVARCHAR(100) NOT NULL,
                    [logo] NVARCHAR(250) NOT NULL,
                    [tagline] NVARCHAR(250) NOT NULL,
                    [description] NVARCHAR(1000) NOT NULL,
                    [website] NVARCHAR(500) NOT NULL,
                    [banner_bg] NVARCHAR(250) NOT NULL DEFAULT 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
                    [brand_color] NVARCHAR(50) NOT NULL DEFAULT '#94a3b8',
                    [has_banner] BIT NOT NULL DEFAULT 1,
                    [display_order] INT NOT NULL DEFAULT 0,
                    CONSTRAINT [PK_tbs_sponsor] PRIMARY KEY CLUSTERED ([id] ASC)
                );

                INSERT INTO [dbo].[tbs_sponsor] ([name], [logo], [tagline], [description], [website], [banner_bg], [brand_color], [has_banner], [display_order])
                VALUES 
                (N'eFootball Thailand', N'⚽', N'คอมมูนิตี้ผู้เล่น eFootball ที่ใหญ่ที่สุดในไทย', N'ศูนย์กลางข่าวสาร เทคนิคการเล่น ตารางแข่งทัวร์นาเมนต์ และการแข่งขันลีกฟุตบอลดิจิทัล eFootball ร่วมสนับสนุนคอมมูนิตี้ผลักดันเกมเมอร์ชาวไทยสู่เวทีแข่งขันระดับท็อป', N'https://www.facebook.com/thaipesleague', N'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', N'#3b82f6', 1, 1),
                (N'MeeStock', N'📦', N'ระบบจัดการร้านค้าและสต็อกสินค้าออนไลน์อัจฉริยะ', N'ผู้ช่วยส่วนตัวของแม่ค้าพ่อค้าออนไลน์ จัดการสต็อกสินค้า ติดตามสถานะออเดอร์ วิเคราะห์สถิติยอดขาย ครบครัน รวดเร็ว และใช้งานง่ายที่สุด', N'https://meestock.com', N'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', N'#6366f1', 1, 2),
                (N'CrazyGamer CH', N'🎮', N'สตรีมเมอร์และช่องแคสเกมวาไรตี้สุดมันส์', N'อัปเดตบทวิเคราะห์ตัวผู้เล่น ไฮไลต์ทัวร์นาเมนต์การแข่งขัน และเทคนิคเด็ดในการเอาชนะคู่แข่ง ส่งตรงจากกูรูเกมฟุตบอล eFootball มือโปร', N'https://www.youtube.com/@iamcrazygamerch', N'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', N'#ef4444', 1, 3),
                (N'Rapid Logistics', N'⚡', N'บริการขนส่งด่วนพิเศษเชื่อมต่อระบบร้านค้าออนไลน์', N'ระบบจัดส่งพัสดุและขนส่งด่วนพิเศษ รองรับการเชื่อมต่อ API สำหรับ E-commerce แพ็กไว ส่งเร็ว ดูแลความปลอดภัยของสินค้าในทุกออเดอร์', N'https://rapidsupply.co.th', N'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', N'#06b6d4', 1, 4),
                (N'SecureGate VPN', N'🛡️', N'ปกป้องความเป็นส่วนตัวและช่วยลดปิงขณะเล่นเกม', N'ระบบเน็ตเวิร์กอัจฉริยะลดอัตราการดีเลย์ (Ping) และช่วยเข้ารหัสข้อมูลเครือข่าย ปลอดภัยจากการโจมตี มั่นใจได้ในทุกการเชื่อมต่อและการสตรีมมิ่ง', N'https://securegate.io', N'linear-gradient(135deg, #10b981 0%, #064e3b 100%)', N'#10b981', 1, 5),
                (N'Thai eSports Association', N'🏆', N'สมาคมกีฬาอีสปอร์ตแห่งประเทศไทย', N'ผู้สนับสนุนอย่างเป็นทางการในการพัฒนาระบบนิเวศอีสปอร์ตไทย ช่วยผลักดันและยกระดับมาตรฐานผู้เล่นสู่เวทีทีมชาติและการแข่งขันทัวร์นาเมนต์สากล', N'https://tesa.or.th', N'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)', N'#94a3b8', 1, 6);
            END
            ELSE
            BEGIN
                -- Upgrade undersized columns if they exist from an older schema
                IF (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'tbs_sponsor' AND COLUMN_NAME = 'logo') < 250
                BEGIN
                    ALTER TABLE [dbo].[tbs_sponsor] ALTER COLUMN [logo] NVARCHAR(250) NOT NULL;
                END
                IF (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'tbs_sponsor' AND COLUMN_NAME = 'banner_bg') < 500
                BEGIN
                    ALTER TABLE [dbo].[tbs_sponsor] ALTER COLUMN [banner_bg] NVARCHAR(500) NOT NULL;
                END
                IF (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'tbs_sponsor' AND COLUMN_NAME = 'tagline') < 250
                BEGIN
                    ALTER TABLE [dbo].[tbs_sponsor] ALTER COLUMN [tagline] NVARCHAR(250) NOT NULL;
                END
                IF (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'tbs_sponsor' AND COLUMN_NAME = 'name') < 200
                BEGIN
                    ALTER TABLE [dbo].[tbs_sponsor] ALTER COLUMN [name] NVARCHAR(200) NOT NULL;
                END
            END

            -- Add sponsor_banner_url to tbs_special_tournament if it doesn't exist
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[tbs_special_tournament]') 
                AND name = 'sponsor_banner_url'
            )
            BEGIN
                ALTER TABLE [dbo].[tbs_special_tournament] ADD [sponsor_banner_url] NVARCHAR(MAX) NULL;
            END
        ";
        context.Database.ExecuteSqlRaw(sql);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB AutoInit] Database initialization failed: {ex.Message}");
    }
}

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

