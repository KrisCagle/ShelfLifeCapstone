using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;
using ShelfLifeAPI.Services;
using ShelfLifeAPI.Services.Market;
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

// Catalog metadata sources. MusicBrainz, Open Library and Wikimedia ask apps to identify
// themselves with a way to reach the developer; set Metadata:Contact to an email address.
var contact = builder.Configuration["Metadata:Contact"];
var userAgent = builder.Configuration["Metadata:UserAgent"]
    ?? $"ShelfLife/0.1 (https://github.com/KrisCagle/ShelfLifeCapstone{(string.IsNullOrWhiteSpace(contact) ? "" : $"; {contact.Trim()}")})";
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
builder.Services.AddHttpClient<EbayBarcodeProvider>(Metadata);
builder.Services.AddHttpClient<OpenLibraryProvider>(client =>
{
    Metadata(client);
    // A barcode lookup is several calls, and Open Library can be slow.
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<IgdbProvider>());
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<MusicBrainzProvider>());
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<TmdbProvider>());
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<OpenLibraryProvider>());
// Comics read ShelfLife's own copy of the GCD (tools/GcdImport), not a web API.
builder.Services.AddScoped<GcdProvider>();
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<GcdProvider>());
builder.Services.AddHttpClient<WikidataGamesProvider>(Metadata);
builder.Services.AddHttpClient<WikidataMoviesProvider>(Metadata);
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<WikidataGamesProvider>());
builder.Services.AddTransient<IMetadataProvider>(sp => sp.GetRequiredService<WikidataMoviesProvider>());
builder.Services.AddScoped<MetadataService>();
builder.Services.AddHttpClient<EbayAuth>(Metadata);
builder.Services.AddHttpClient<EbayListings>(Metadata);
builder.Services.AddScoped<CollectorsPaid>();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<CatalogRematch>();

builder.Services.AddSingleton<IPhotoStorage, LocalPhotoStorage>();

// Enough for a big haul with a photo of everything, but not for filling the disk.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, cancellationToken) =>
        new ValueTask(context.HttpContext.Response.WriteAsJsonAsync(
            new { detail = "Too many tries. Wait a few minutes and try again." }, cancellationToken));
    options.AddPolicy("photos", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 200, Window = TimeSpan.FromHours(1) }));
    // Per network address, on top of each account's own lockout: slows down someone trying
    // many accounts, or many passwords, from one place.
    options.AddPolicy("login", context => RateLimitPartition.GetSlidingWindowLimiter(
        ClientAddress(context),
        _ => new SlidingWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5), SegmentsPerWindow = 5 }));
    options.AddPolicy("register", context => RateLimitPartition.GetFixedWindowLimiter(
        ClientAddress(context),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromHours(1) }));
    // Deleting an account or exporting it asks for the password again, so it's a login too.
    options.AddPolicy("account", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ClientAddress(context),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromHours(1) }));
});

static string ClientAddress(HttpContext context) => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

// In production the API sits behind the host's proxy, so the connection comes from the proxy,
// not the visitor. Turn this on there (ForwardedHeaders:Enabled) so rate limits see the
// visitor's address and HTTPS is recognised. ForwardLimit is how many proxies to trust,
// counted from the API outwards: an address the visitor adds themselves is never trusted.
var forwarded = builder.Configuration.GetSection("ForwardedHeaders");
if (forwarded.GetValue<bool>("Enabled"))
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = forwarded.GetValue<int?>("ForwardLimit") ?? 1;
        // The host's proxy addresses aren't fixed, so trust by position instead of address.
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    });
}

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
        // Only ever sent over HTTPS. Local development runs on plain http://localhost.
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        // Signed in for two weeks, renewed while the app is in use.
        options.Cookie.MaxAge = TimeSpan.FromDays(14);
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.SlidingExpiration = true;
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
    // Length matters far more than character rules, which mostly lead to "Password1!".
    config.Password.RequiredLength = 10;
    config.Password.RequireLowercase = false;
    config.Password.RequireNonAlphanumeric = false;
    config.Password.RequireUppercase = false;
    config.User.RequireUniqueEmail = true;
    // Five wrong passwords in a row lock the account for 15 minutes.
    config.Lockout.AllowedForNewUsers = true;
    config.Lockout.MaxFailedAccessAttempts = 5;
    config.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
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

builder.Services.AddDataProtection()
    .SetApplicationName("ShelfLife")
    .PersistKeysToDbContext<ShelfLifeDbContext>();

var app = builder.Build();

if (forwarded.GetValue<bool>("Enabled"))
    app.UseForwardedHeaders();

// Unhandled exceptions become a generic ProblemDetails 500; the real error is
// logged server-side instead of being sent to the client.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Tells browsers to use HTTPS only for this site from now on.
    app.UseHsts();
}

app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();