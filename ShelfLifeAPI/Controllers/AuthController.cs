using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text;
using ShelfLifeAPI.Data;
using ShelfLifeAPI.Models;

namespace ShelfLifeAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private ShelfLifeDbContext _dbContext;
        private UserManager<ApplicationUser> _userManager;

        public AuthController(ShelfLifeDbContext context, UserManager<ApplicationUser> userManager)
        {
            _dbContext = context;
            _userManager = userManager;
        }

        [HttpPost("login")]
        public IActionResult Login([FromHeader(Name = "Authorization")] string authHeader)
        {
            try
            {
                string encodedCreds = authHeader.Substring(6).Trim();
                string creds = Encoding
                    .GetEncoding("iso-8859-1")
                    .GetString(Convert.FromBase64String(encodedCreds));

                int separator = creds.IndexOf(':');
                string email = creds.Substring(0, separator);
                string password = creds.Substring(separator + 1);

                var user = _dbContext.Users.Where(u => u.Email == email).FirstOrDefault();
                var hasher = new PasswordHasher<ApplicationUser>();
                var result = hasher.VerifyHashedPassword(user, user.PasswordHash, password);

                if (user != null && result == PasswordVerificationResult.Success)
                {
                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                        new Claim(ClaimTypes.Name, user.UserName.ToString()),
                        new Claim(ClaimTypes.Email, user.Email)
                    };

                    var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

                    HttpContext.SignInAsync(
                        CookieAuthenticationDefaults.AuthenticationScheme,
                        new ClaimsPrincipal(claimsIdentity)).Wait();

                    return Ok();
                }

                return new UnauthorizedResult();
            }
            catch (Exception ex)
            {
                return StatusCode(500);
            }
        }

        [HttpGet("logout")]
        [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public IActionResult Logout()
        {
            try
            {
                HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme).Wait();
                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500);
            }
        }

        [HttpGet("Me")]
        [Authorize]
        public IActionResult Me()
        {
            var identityUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var profile = _dbContext.UserProfiles.SingleOrDefault(up => up.IdentityUserId == identityUserId);
            if (profile != null)
            {
                return Ok(new
                {
                    Id = profile.Id,
                    FirstName = profile.FirstName,
                    LastName = profile.LastName,
                    IdentityUserId = identityUserId,
                    UserName = User.FindFirstValue(ClaimTypes.Name),
                    Email = User.FindFirstValue(ClaimTypes.Email)
                });
            }
            return NotFound();
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegistrationDto registration)
        {
            var user = new ApplicationUser
            {
                UserName = registration.UserName,
                Email = registration.Email
            };

            var password = Encoding
                .GetEncoding("iso-8859-1")
                .GetString(Convert.FromBase64String(registration.Password));

            var result = await _userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                _dbContext.UserProfiles.Add(new UserProfile
                {
                    FirstName = registration.FirstName,
                    LastName = registration.LastName,
                    Address = registration.Address,
                    IdentityUserId = user.Id
                });
                _dbContext.SaveChanges();

                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.UserName.ToString()),
                    new Claim(ClaimTypes.Email, user.Email)
                };

                var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

                HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(claimsIdentity)).Wait();

                return Ok();
            }
            return StatusCode(500);
        }
    }

    public class RegistrationDto
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Address { get; set; }
    }
}