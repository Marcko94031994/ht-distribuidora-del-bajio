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
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public OrdersController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var total = await _context.Orders.CountAsync();
        var orders = await _context.Orders
            .Include(o => o.Items)
            .OrderByDescending(o => o.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        return Ok(new { data = orders, total, page, pageSize });
    }

    private string SaveImage(string base64, string subfolder)
        {
            if (string.IsNullOrEmpty(base64) || !base64.Contains(",")) return base64;
            try
            {
                var parts = base64.Split(',');
                var extension = "jpg";
                if (parts[0].Contains("png")) extension = "png";
                
                var bytes = Convert.FromBase64String(parts[1]);
                var fileName = $"{Guid.NewGuid()}.{extension}";
                var path = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", subfolder, fileName);
                
                var dir = Path.GetDirectoryName(path);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir!);
                
                System.IO.File.WriteAllBytes(path, bytes);
                return $"/uploads/{subfolder}/{fileName}";
            }
            catch { return base64; }
        }

    [HttpPost("order")]
        public async Task<IActionResult> CreateOrder([FromBody] OrderInputModel input)
        {
            var client = await _context.Clients.FindAsync(input.ClientId);
            if (client == null) return NotFound("Client not found");
    
            var order = new Order
            {
                OrderNumber = "P-" + new Random().Next(1000, 9999),
                Status = "Pendiente",
                Time = DateTime.Now.ToString("HH:mm"),
                ClientId = input.ClientId,
                RouteId = input.RouteId,
                DriverId = input.DriverId,
                PhotoBase64 = SaveImage(input.PhotoBase64 ?? "", "orders"),
                PaymentMethod = input.PaymentMethod,
                Latitude = input.Latitude,
                Longitude = input.Longitude
            };
    
            // Geo-validation (Technical Plus)
            double distance = Math.Sqrt(Math.Pow(client.Latitude - input.Latitude, 2) + Math.Pow(client.Longitude - input.Longitude, 2));
            if (distance < 0.005) // Approx 500m for demo, real would be tighter
            {
                order.IsGeoValidated = true;
            }
    
            decimal total = 0;
            decimal totalTax = 0;
            decimal totalCost = 0;
    
            foreach (var item in input.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    var subtotal = product.Price * item.Quantity;
                    var tax = subtotal * (product.IvaRate + product.IepsRate);
                    
                    total += subtotal + tax;
                    totalTax += tax;
                    totalCost += product.Cost * item.Quantity;
    
                    _context.OrderItems.Add(new OrderItem
                    {
                        Order = order,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price
                    });
                }
            }
    
            order.TotalAmount = total;
            order.TotalTax = totalTax;
            order.TotalCost = totalCost;
    
            if (input.PaymentMethod == "Crédito")
            {
                if (client.HasOverdueDebt || (client.CurrentBalance + total > client.CreditLimit))
                {
                    order.Status = "Esperando Autorización Admin";
                    order.NeedsAdminApproval = true;
                    order.AdminApprovalReason = client.HasOverdueDebt ? "Cartera Vencida" : "Excede Límite de Crédito";
                }
            }
    
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
    
            return Ok(order);
        }

    [HttpPost("incident")]
        public async Task<IActionResult> ReportIncident([FromBody] IncidentInputModel input)
        {
            var driver = await _context.Drivers.FindAsync(input.DriverId);
            if (driver == null) return NotFound("Driver not found");
    
            driver.HasIncident = true;
            driver.IncidentReason = input.Reason;
            driver.Status = "Con Retraso";
            
            await _context.SaveChangesAsync();
    
            return Ok(driver);
        }

    [HttpPost("authorize-order/{id}")]
        public async Task<IActionResult> AuthorizeOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Client)
                .FirstOrDefaultAsync(o => o.Id == id);
                
            if (order == null) return NotFound("Order not found");
            if (order.Status != "Pendiente" && order.Status != "Esperando Autorización Admin") return BadRequest("Order is not in a state that can be authorized");
    
            if (order.Status == "Esperando Autorización Admin" && !order.IsApprovedByAdmin)
            {
                return BadRequest("Order requires Admin authorization first.");
            }
    
            order.Status = "En remisión";
    
            // Subtract inventory using FEFO (First Expired, First Out)
            foreach (var item in order.Items)
            {
                var product = await _context.Products
                    .Include(p => p.Batches)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
    
                if (product != null)
                {
                    int remainingToDeduct = item.Quantity;
                    
                    // Get batches sorted by expiration date
                    var batches = product.Batches
                        .Where(b => b.Quantity > 0)
                        .OrderBy(b => b.ExpirationDate)
                        .ToList();
    
                    foreach (var batch in batches)
                    {
                        if (remainingToDeduct <= 0) break;
    
                        int deductFromThisBatch = Math.Min(batch.Quantity, remainingToDeduct);
                        batch.Quantity -= deductFromThisBatch;
                        remainingToDeduct -= deductFromThisBatch;
                    }
    
                    // Update general stock
                    product.Stock -= item.Quantity;
                    if (product.Stock < 0) product.Stock = 0;
    
                    // Log movement
                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductId = product.Id,
                        Quantity = -item.Quantity,
                        Type = "Salida",
                        Reason = "Venta",
                        Date = DateTime.Now,
                        UserId = 1, // Default admin for now
                        Reference = order.OrderNumber
                    });
                }
            }
    
            if (order.PaymentMethod == "Crédito" && order.Client != null)
            {
                order.Client.CurrentBalance += order.TotalAmount;
            }
    
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("order/{id}/admin-authorize")]
        public async Task<IActionResult> AuthorizeAdminOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound("Order not found");
            
            order.IsApprovedByAdmin = true;
            order.Status = "Pendiente";
            
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("complete-delivery")]
        public async Task<IActionResult> CompleteDelivery([FromBody] DeliveryInputModel input)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => o.Id == input.OrderId);
                
            if (order == null) return NotFound("Order not found");
    
            var client = await _context.Clients.FindAsync(order.ClientId);
            if (client != null)
            {
                client.IsVisited = true;
            }
    
            order.Status = "Entregado";
            order.DeliveryPhotoBase64 = SaveImage(input.PhotoBase64 ?? "", "deliveries");
    
            if (order.Driver != null)
            {
                decimal total = order.Items.Sum(i => i.Quantity * i.UnitPrice);
                order.CommissionAmount = total * (order.Driver.CommissionPercentage / 100);
            }
            
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("order/{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string status)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound("Order not found");
            order.Status = status;
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("order-return")]
        public async Task<IActionResult> CreateReturn([FromBody] OrderReturnBatchInput input)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Driver)
                .FirstOrDefaultAsync(o => o.Id == input.OrderId);
                
            if (order == null) return NotFound("Order not found");
    
            decimal totalReturns = 0;
            foreach (var ret in input.Returns)
            {
                var orderReturn = new OrderReturn
                {
                    OrderId = input.OrderId,
                    ProductId = ret.ProductId,
                    Quantity = ret.Quantity,
                    Reason = ret.Reason,
                    Status = "Pendiente"
                };
                _context.OrderReturns.Add(orderReturn);
                
                var item = order.Items.FirstOrDefault(i => i.ProductId == ret.ProductId);
                if (item != null) totalReturns += ret.Quantity * item.UnitPrice;
            }
    
            order.Status = "Entregado con Devolución";
            
            if (order.Driver != null)
            {
                decimal totalOriginal = order.Items.Sum(i => i.Quantity * i.UnitPrice);
                decimal netTotal = totalOriginal - totalReturns;
                order.CommissionAmount = netTotal * (order.Driver.CommissionPercentage / 100);
            }
    
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("order-return/{id}/authorize")]
        public async Task<IActionResult> AuthorizeReturn(int id, [FromBody] ReturnAuthorizeInputModel input)
        {
            var ret = await _context.OrderReturns.FindAsync(id);
            if (ret == null) return NotFound("Return not found");
    
            if (!input.IsWaste)
            {
                var product = await _context.Products.FindAsync(ret.ProductId);
                if (product != null)
                {
                    product.Stock += ret.Quantity;
                }
                ret.Status = "Reingresado";
            }
            else
            {
                ret.Status = "Merma";
            }
    
            await _context.SaveChangesAsync();
            return Ok();
        }

    [HttpPost("order/{id}/stamp")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> StampOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            
            var client = await _context.Clients.FindAsync(order.ClientId);
            if (client == null || string.IsNullOrEmpty(client.RFC)) 
                return BadRequest("El cliente no tiene RFC configurado.");
    
            order.IsFacturado = true;
            order.FolioFiscal = Guid.NewGuid().ToString().ToUpper();
            order.FechaFacturacion = DateTime.Now;
    
            await _context.SaveChangesAsync();
            return Ok(new { uuid = order.FolioFiscal });
        }

}
