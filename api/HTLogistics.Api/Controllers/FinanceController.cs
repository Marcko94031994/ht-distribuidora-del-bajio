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

namespace HTLogistics.Api.Controllers;

[ApiController]
[Route("api/app")]
[Authorize]
public class FinanceController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public FinanceController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("cash-closure")]
        public async Task<IActionResult> CreateCashClosure([FromBody] CashClosureInputModel input)
        {
            var closure = new CashClosure 
            { 
                DriverId = input.DriverId,
                RouteId = input.RouteId,
                Date = DateTime.Now,
                TotalExpected = input.TotalExpected,
                TotalReceived = input.TotalReceived,
                Status = "Cerrado",
                Observations = input.Observations
            };
            _context.CashClosures.Add(closure);
            await _context.SaveChangesAsync();
            return Ok(closure);
        }

    [HttpPost("cash-closure/declare")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeclareCashClosure([FromBody] CashClosureDeclareInput input)
        {
            var closure = await _context.CashClosures.FindAsync(input.ClosureId);
            if (closure == null) return NotFound();
    
            closure.TotalDeclared = input.TotalDeclared;
            closure.Difference = closure.TotalDeclared - closure.TotalExpected;
            closure.Status = "Cerrado";
            closure.Observations = input.Observations;
    
            await _context.SaveChangesAsync();
            return Ok(closure);
        }

    [HttpPost("payment")]
        public async Task<IActionResult> AddPayment([FromBody] PaymentInputModel input)
        {
            var client = await _context.Clients.FindAsync(input.ClientId);
            if (client == null) return NotFound("Client not found");
    
            var payment = new ClientPayment
            {
                ClientId = input.ClientId,
                Amount = input.Amount,
                Date = DateTime.Now,
                Reference = input.Reference,
                PaymentMethod = input.PaymentMethod
            };
    
            client.CurrentBalance -= input.Amount;
            if (client.CurrentBalance < 0) client.CurrentBalance = 0;
    
            _context.ClientPayments.Add(payment);
            await _context.SaveChangesAsync();
            return Ok(payment);
        }

    [HttpGet("client/{id}/statement")]
        public async Task<IActionResult> GetAccountStatement(int id)
        {
            var orders = await _context.Orders
                .Where(o => o.ClientId == id && o.PaymentMethod == "Crédito")
                .OrderByDescending(o => o.Id)
                .ToListAsync();
    
            var payments = await _context.ClientPayments
                .Where(p => p.ClientId == id)
                .OrderByDescending(p => p.Date)
                .ToListAsync();
    
            return Ok(new { orders, payments });
        }

}
