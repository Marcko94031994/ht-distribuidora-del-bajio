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
            closure.TotalExpenses = input.TotalExpenses;
            // Difference = lo que entrego físicamente + lo que gasté - lo que el sistema esperaba que entregara
            closure.Difference = (closure.TotalDeclared + closure.TotalExpenses) - closure.TotalExpected;
            closure.Status = "Cerrado";
            closure.Observations = input.Observations;
    
            await _context.SaveChangesAsync();
            return Ok(closure);
        }

    [HttpPost("expense")]
        public async Task<IActionResult> RegisterExpense([FromBody] ExpenseInputModel input)
        {
            var expense = new Expense
            {
                Concept = input.Concept,
                Amount = input.Amount,
                Date = DateTime.Now,
                ReferenceNumber = input.ReferenceNumber,
                ExpenseCategoryId = input.ExpenseCategoryId,
                IsPaid = true
            };
            
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
            return Ok(expense);
        }

    [HttpPost("payment")]
        public async Task<IActionResult> AddPayment([FromBody] PaymentInputModel input)
        {
            var client = await _context.Clients.FindAsync(input.ClientId);
            if (client == null) return NotFound("Client not found");
    
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payment = new ClientPayment
            {
                ClientId = input.ClientId,
                Amount = input.Amount,
                Date = DateTime.Now,
                Reference = input.Reference,
                PaymentMethod = input.PaymentMethod
            };
    
            // FIFO logic to distribute payment across unpaid orders
            var pendingOrders = await _context.Orders
                .Where(o => o.ClientId == input.ClientId && o.PaymentMethod == "Crédito" && o.AmountPaid < o.TotalAmount)
                .OrderBy(o => o.Date)
                .ToListAsync();

            decimal remainingPayment = input.Amount;
            foreach(var o in pendingOrders)
            {
                if (remainingPayment <= 0) break;
                
                decimal debt = o.TotalAmount - o.AmountPaid;
                if (remainingPayment >= debt)
                {
                    o.AmountPaid = o.TotalAmount;
                    remainingPayment -= debt;
                }
                else
                {
                    o.AmountPaid += remainingPayment;
                    remainingPayment = 0;
                }
            }

            client.CurrentBalance -= input.Amount;
            if (client.CurrentBalance < 0) client.CurrentBalance = 0;
            
            _context.ClientPayments.Add(payment);
            await _context.SaveChangesAsync();

            client.HasOverdueDebt = await _context.Orders.AnyAsync(o => o.ClientId == client.Id && o.PaymentMethod == "Crédito" && o.AmountPaid < o.TotalAmount && o.DueDate < DateTime.Now);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
            return Ok(payment);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, "Error interno al procesar el pago: " + ex.Message);
            }
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

    [HttpGet("finance/daily-summary")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> GetDailySummary([FromQuery] string? date)
        {
            if (!DateTime.TryParse(date, out var targetDate)) 
                targetDate = DateTime.Today;

            var startDate = targetDate.Date;
            var endDate = startDate.AddDays(1);

            // Efectivo entregado por rutas liquidadas hoy
            var totalRouteCash = await _context.CashClosures
                .Where(c => c.Date >= startDate && c.Date < endDate && c.Status == "Cerrado")
                .SumAsync(c => c.TotalDeclared);

            // Gastos administrativos registrados hoy (sin referencia a ruta)
            var branchExpenses = await _context.Expenses
                .Where(e => e.Date >= startDate && e.Date < endDate && (e.ReferenceNumber == null || !e.ReferenceNumber.StartsWith("Route-")))
                .SumAsync(e => e.Amount);

            // Aquí podríamos sumar ClientPayments si se reciben en sucursal directamente, 
            // pero actualmente todo lo recauda el vendedor en su ruta y entra a TotalDeclared.

            return Ok(new {
                date = startDate,
                totalRouteCash,
                totalBranchExpenses = branchExpenses,
                expectedCashInSafe = totalRouteCash - branchExpenses
            });
        }

    [HttpPost("finance/daily-closure")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateDailyClosure([FromBody] DailyClosureDeclareInput input)
        {
            var targetDate = DateTime.Today;
            var startDate = targetDate.Date;
            var endDate = startDate.AddDays(1);

            // Evitar doble cierre en el mismo día
            var existingClosure = await _context.DailyClosures.FirstOrDefaultAsync(c => c.Date >= startDate && c.Date < endDate);
            if (existingClosure != null) return BadRequest("Ya existe un cierre para el día de hoy.");

            var totalRouteCash = await _context.CashClosures
                .Where(c => c.Date >= startDate && c.Date < endDate && c.Status == "Cerrado")
                .SumAsync(c => c.TotalDeclared);

            var branchExpenses = await _context.Expenses
                .Where(e => e.Date >= startDate && e.Date < endDate && (e.ReferenceNumber == null || !e.ReferenceNumber.StartsWith("Route-")))
                .SumAsync(e => e.Amount);

            var expected = totalRouteCash - branchExpenses;
            
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("Invalid user token.");
                            var userId = int.Parse(userIdString);

            var closure = new DailyClosure
            {
                Date = DateTime.Now,
                TotalRouteCash = totalRouteCash,
                TotalBranchExpenses = branchExpenses,
                ExpectedCashInSafe = expected,
                DeclaredCashInSafe = input.DeclaredCashInSafe,
                Difference = input.DeclaredCashInSafe - expected,
                Observations = input.Observations,
                UserId = userId
            };

            _context.DailyClosures.Add(closure);
            await _context.SaveChangesAsync();
            return Ok(closure);
        }

    [HttpGet("finance/daily-closures")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> GetDailyClosures()
        {
            var closures = await _context.DailyClosures
                .OrderByDescending(c => c.Date)
                .Take(30)
                .ToListAsync();
            return Ok(closures);
        }

    [HttpGet("finance/cxc")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> GetAccountsReceivable()
        {
            var clientsWithDebt = await _context.Clients
                .Where(c => c.CurrentBalance > 0)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Zone,
                    c.CurrentBalance,
                    c.HasOverdueDebt,
                    UnpaidOrders = _context.Orders
                        .Where(o => o.ClientId == c.Id && o.PaymentMethod == "Crédito" && o.AmountPaid < o.TotalAmount)
                        .Select(o => new {
                            o.Id,
                            o.OrderNumber,
                            o.Date,
                            o.DueDate,
                            o.TotalAmount,
                            o.AmountPaid,
                            IsOverdue = o.DueDate < DateTime.Now
                        })
                        .OrderBy(o => o.Date)
                        .ToList()
                })
                .ToListAsync();

            return Ok(clientsWithDebt);
        }

    [HttpGet("provider/{id}/statement")]
        public async Task<IActionResult> GetProviderStatement(int id)
        {
            var provider = await _context.Providers.FindAsync(id);
            if (provider == null) return NotFound("Proveedor no encontrado");

            var purchaseOrders = await _context.PurchaseOrders
                .Where(po => po.ProviderId == id && po.Status != "Cancelada")
                .OrderByDescending(po => po.Id)
                .Select(po => new {
                    po.Id,
                    po.PoNumber,
                    po.Reference1,
                    po.Reference2,
                    po.Status,
                    po.Date,
                    po.DueDate,
                    po.Subtotal,
                    po.TaxAmount,
                    po.TotalAmount,
                    po.AmountPaid,
                    Balance = po.TotalAmount - po.AmountPaid,
                    IsOverdue = po.DueDate.HasValue && po.DueDate.Value < DateTime.Now && po.AmountPaid < po.TotalAmount,
                    DaysOverdue = po.DueDate.HasValue && po.DueDate.Value < DateTime.Now && po.AmountPaid < po.TotalAmount
                        ? (int)(DateTime.Now - po.DueDate.Value).TotalDays
                        : 0
                })
                .ToListAsync();

            var payments = await _context.ProviderPayments
                .Where(p => p.ProviderId == id)
                .OrderByDescending(p => p.Date)
                .ToListAsync();

            return Ok(new { provider, purchaseOrders, payments });
        }

    [HttpGet("finance/cxp")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> GetAccountsPayable()
        {
            var now = DateTime.Now;
            var providersWithDebt = await _context.Providers
                .Where(p => p.CurrentBalance > 0)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.RFC,
                    p.Contact,
                    p.Phone,
                    p.Address,
                    p.CurrentBalance,
                    UnpaidPOs = _context.PurchaseOrders
                        .Where(po => po.ProviderId == p.Id && po.AmountPaid < po.TotalAmount && po.Status != "Cancelada")
                        .Select(po => new {
                            po.Id,
                            po.PoNumber,
                            po.Reference1,
                            po.Reference2,
                            po.Status,
                            po.Date,
                            po.DueDate,
                            po.TotalAmount,
                            po.AmountPaid,
                            Balance = po.TotalAmount - po.AmountPaid,
                            IsOverdue = po.DueDate.HasValue && po.DueDate.Value < now,
                            DaysOverdue = po.DueDate.HasValue && po.DueDate.Value < now ? (int)(now - po.DueDate.Value).TotalDays : 0
                        })
                        .OrderBy(po => po.Date)
                        .ToList()
                })
                .ToListAsync();

            return Ok(providersWithDebt);
        }

}

