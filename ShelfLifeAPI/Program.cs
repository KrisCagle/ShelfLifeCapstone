using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;
using ShelfLifeAPI.Services.Metadata;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddProblemDetails();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<NewsFeedService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("ShelfLife/1.0 (+news reader)");
});
builder.Services.AddAuthorization(options => options.AddShelfLifePolicies(builder.Configuration));

// Catalog metadata sources. MusicBrainz asks clients to identify themselves.
var userAgent = builder.Configuration["Metadata:UserAgent"] ?? "ShelfLife/0.1 (https://github.com/KrisCagle/ShelfLifeCapstone)";
void Metadata(HttpClient client)
{
    client.Timeout = TimeSpan.FromSeconds(8);
    client.DefaultRequestHeaders.UserAgent.ParseAdd(userAgent);
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
}
builder.Services.AddHttpClient<MusicBrainzProvider>(Metadata);
builder.Services.AddHttpClient<IgdbProvider>(Metadata);
builder.Services.AddHttpClient<TmdbProvider>(Metadata);
builder.Services.AddHttpClient<UpcItemDbProvider>(Metadata);
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<IgdbProvider>());
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<MusicBrainzProvider>());
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<TmdbProvider>());
builder.Services.AddScoped<MetadataService>();
builder.Services.AddScoped<CatalogService>();

// The React app reaches the API through a same-origin proxy (Vite in dev, Vercel
// rewrites in production), so browsers normally never make cross-origin calls.
// Only origins listed in config are trusted; never a wildcard like *.vercel.app,
// since anyone can deploy a site there.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
    {
        options.Cookie.Name = "ShelfLifeLoginCookie";
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.HttpOnly = true;
        options.Cookie.MaxAge = new TimeSpan(7, 0, 0, 0);
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = new TimeSpan(24, 0, 0);
        options.Events.OnRedirectToLogin = (context) =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = (context) =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddIdentityCore<ApplicationUser>(config =>
{
    config.Password.RequireDigit = false;
    config.Password.RequiredLength = 6;
    config.Password.RequireLowercase = false;
    config.Password.RequireNonAlphanumeric = false;
    config.Password.RequireUppercase = false;
    config.User.RequireUniqueEmail = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<ShelfLifeDbContext>();

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

// Hosts like Render and Supabase hand out URL-style connection strings
// (postgres://user:pass@host:port/db); Npgsql wants key=value pairs.
if (connectionString != null &&
    (connectionString.StartsWith("postgres://") || connectionString.StartsWith("postgresql://")))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = Uri.UnescapeDataString(userInfo[1]);
    var port = uri.Port > 0 ? uri.Port : 5432;
    connectionString = $"Host={uri.Host};Port={port};Database={uri.AbsolutePath.TrimStart('/')};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
}

builder.Services.AddNpgsql<ShelfLifeDbContext>(connectionString);

var app = builder.Build();

// Unhandled exceptions become a generic ProblemDetails 500; the real error is
// logged server-side instead of being sent to the client.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();