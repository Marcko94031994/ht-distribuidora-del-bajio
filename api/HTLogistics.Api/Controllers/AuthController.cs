using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.IO;
using BCrypt.Net;

namespace HTLogistics.Api.Controllers;

[ApiController]
[Route("api/app")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }



    [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginInputModel input)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == input.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(input.Password, user.Password)) 
                return Unauthorized(new { message = "Credenciales incorrectas" });
            
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSettings = _configuration.GetSection("Jwt");
            var secretKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key is missing");
            var key = Encoding.UTF8.GetBytes(secretKey);
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email!),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            
            return Ok(new {
                token = tokenHandler.WriteToken(token),
                user = new { user.Id, user.Name, user.Email, user.Role, user.ClientId, SucursalId = user.SucursalId, Permissions = user.Permissions }
            });
        }

    [HttpPost("user")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateUser([FromBody] UserInputModel input)
        {
            var user = new User 
            { 
                Name = input.Name, 
                Email = input.Email, 
                Password = input.Password, 
                Role = input.Role,
                Permissions = input.Permissions,
                SucursalId = input.SucursalId,
                ClientId = input.ClientId
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return Ok(user);
        }

    [HttpPut("user/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserInputModel input)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            
            user.Name = input.Name;
            user.Email = input.Email;
            if (!string.IsNullOrEmpty(input.Password)) user.Password = input.Password;
            user.Role = input.Role;
            user.Permissions = input.Permissions;
            user.SucursalId = input.SucursalId;
            user.ClientId = input.ClientId;
            
            await _context.SaveChangesAsync();
            return Ok(user);
        }

}
