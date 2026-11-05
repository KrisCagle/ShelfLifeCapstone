using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        private readonly ShelfLifeDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public AuthController(ShelfLifeDbContext context, UserManager<ApplicationUser> userManager)
        {
            _dbContext = context;
            _userManager = userManager;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromHeader(Name = "Authorization")] string? authHeader)
        {
            if (!TryParseBasicAuth(authHeader, out var email, out var password))
                return Unauthorized("Invalid email or password");

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null || !await _userManager.CheckPasswordAsync(user, password))
                return Unauthorized("Invalid email or password");

            await SignInAsync(user);
            return Ok();
        }

        [HttpPost("logout")]
        [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok();
        }

        [HttpGet("Me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var identityUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var profile = await _dbContext.UserProfiles.SingleOrDefaultAsync(up => up.IdentityUserId == identityUserId);
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
            string password;
            try
            {
                password = Encoding.Latin1.GetString(Convert.FromBase64String(registration.Password));
            }
            catch (FormatException)
            {
                return BadRequest("Password must be base64 encoded");
            }

            var user = new ApplicationUser
            {
                UserName = registration.UserName,
                Email = registration.Email
            };

            var result = await _userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                    ModelState.AddModelError(error.Code, error.Description);
                return ValidationProblem(ModelState);
            }

            _dbContext.UserProfiles.Add(new UserProfile
            {
                FirstName = registration.FirstName,
                LastName = registration.LastName,
                IdentityUserId = user.Id
            });
            await _dbContext.SaveChangesAsync();

            await SignInAsync(user);
            return Ok();
        }

        private async Task SignInAsync(ApplicationUser user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName!),
                new Claim(ClaimTypes.Email, user.Email!)
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity));
        }

        // Reads "Basic base64(email:password)". Returns false for anything malformed
        // so bad input gets a 401 instead of an exception.
        private static bool TryParseBasicAuth(string? header, out string email, out string password)
        {
            email = password = string.Empty;
            if (header == null || !header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
                return false;

            string creds;
            try
            {
                creds = Encoding.Latin1.GetString(Convert.FromBase64String(header[6..].Trim()));
            }
            catch (FormatException)
            {
                return false;
            }

            var separator = creds.IndexOf(':');
            if (separator <= 0)
                return false;

            email = creds[..separator];
            password = creds[(separator + 1)..];
            return true;
        }
    }

    public class RegistrationDto
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
    }
}
