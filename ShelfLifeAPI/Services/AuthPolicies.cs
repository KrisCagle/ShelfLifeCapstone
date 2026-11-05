using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace ShelfLifeAPI.Services
{
    public static class AuthPolicies
    {
        public const string Admin = "Admin";

        // Admins are the accounts whose emails are listed under "Admin:Emails" in config
        // (user secrets locally, environment variables in production). Simple on purpose:
        // there's one admin today, and this avoids a roles UI until it's needed.
        public static void AddShelfLifePolicies(this AuthorizationOptions options, IConfiguration configuration)
        {
            options.AddPolicy(Admin, policy => policy
                .RequireAuthenticatedUser()
                .RequireAssertion(context =>
                {
                    var adminEmails = configuration.GetSection("Admin:Emails").Get<string[]>() ?? [];
                    var email = context.User.FindFirstValue(ClaimTypes.Email);
                    return email != null && adminEmails.Contains(email, StringComparer.OrdinalIgnoreCase);
                }));
        }
    }
}
