using HTLogistics.Api.Services.Interfaces;
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
    private readonly IOrderService _orderService;

    public OrdersController(AppDbContext context, IConfiguration configuration, IOrderService orderService)
    {
        _context = context;
        _configuration = configuration;
        _orderService = orderService;
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var total = await _context.Orders.AsNoTracking().CountAsync();
        var orders = await _context.Orders
            .AsNoTracking()
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
            decimal totalWeight = 0;
    
            foreach (var item in input.Items)
            {
                var product = await _context.Products
                    .Include(p => p.Inventories)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
                if (product != null)
                {
                    if (product.AvailableStock < item.Quantity)
                    {
                        return BadRequest($"Stock insuficiente para {product.Name}. Físico: {product.Stock}");
                    }

                    var finalPrice = item.UnitPrice ?? product.Price;
                    var subtotal = finalPrice * item.Quantity;
                    var tax = subtotal * (product.IvaRate + product.IepsRate);
                    
                    total += subtotal + tax;
                    totalTax += tax;
                    totalCost += product.Cost * item.Quantity;
                    totalWeight += product.Weight * item.Quantity;
    
                    _context.OrderItems.Add(new OrderItem
                    {
                        Order = order,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = finalPrice
                    });

                    // Apartar el inventario para pedidos pendientes
                    var route = await _context.Routes.FindAsync(order.RouteId);
                    var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId && w.Type == "Principal") 
                        ?? await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId)
                        ?? await _context.Warehouses.FirstAsync();
                    var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == warehouse.Id);
                    if (inventory == null) {
                        inventory = new ProductInventory { ProductId = product.Id, WarehouseId = warehouse.Id };
                        _context.ProductInventories.Add(inventory);
                    }
                    inventory.CommittedStock += item.Quantity;
                }
            }
    
            order.TotalAmount = total;
            order.TotalTax = totalTax;
            order.TotalCost = totalCost;
            order.TotalWeight = totalWeight;
    
            if (input.PaymentMethod == "Crédito")
            {
                order.DueDate = DateTime.Now.AddDays(client.CreditDays > 0 ? client.CreditDays : 30);
                if (client.HasOverdueDebt || (client.CurrentBalance + total > client.CreditLimit))
                {
                    order.Status = "Esperando Autorización Admin";
                    order.NeedsAdminApproval = true;
                    order.AdminApprovalReason = client.HasOverdueDebt ? "Cartera Vencida" : "Excede Límite de Crédito";
                }
                client.CurrentBalance += total;
            }
    
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
    
            return Ok(order);
        }

        [HttpPut("order/{id}")]
        public async Task<IActionResult> EditOrder(int id, [FromBody] OrderInputModel input)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound("Order not found");

            if (order.Status != "Pendiente" && order.Status != "Esperando Autorización Admin")
            {
                return BadRequest("Solo se pueden editar pedidos que no han sido surtidos ni procesados.");
            }

            var client = await _context.Clients.FindAsync(order.ClientId);
            if (client == null) return NotFound("Client not found");

            // 1. Revertir cambios originales del pedido
            if (order.PaymentMethod == "Crédito")
            {
                client.CurrentBalance -= order.TotalAmount;
                if (client.CurrentBalance < 0) client.CurrentBalance = 0;
            }

            var route = await _context.Routes.FindAsync(order.RouteId);
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId && w.Type == "Principal") 
                ?? await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId)
                ?? await _context.Warehouses.FirstAsync();

            foreach (var oldItem in order.Items)
            {
                var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == oldItem.ProductId && i.WarehouseId == warehouse.Id);
                if (inventory != null)
                {
                    inventory.CommittedStock -= oldItem.Quantity;
                    if (inventory.CommittedStock < 0) inventory.CommittedStock = 0;
                }
            }
            
            var oldItems = order.Items.ToList();
            _context.OrderItems.RemoveRange(oldItems);
            order.Items.Clear();
            
            // 2. Aplicar nuevos cambios
            decimal total = 0;
            decimal totalTax = 0;
            decimal totalCost = 0;
            decimal totalWeight = 0;

            foreach (var item in input.Items)
            {
                var product = await _context.Products
                    .Include(p => p.Inventories)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);
                if (product != null)
                {
                    // Al editar no es tan estricto el "AvailableStock < item.Quantity", pero sí validar (stock actual + lo que habíamos apartado > nuevo item.Quantity)
                    // Físicamente hay Stock. 
                    var totalAvailableForThis = product.AvailableStock + (oldItems.FirstOrDefault(i => i.ProductId == product.Id)?.Quantity ?? 0);
                    if (totalAvailableForThis < item.Quantity)
                    {
                        return BadRequest($"Stock insuficiente para {product.Name}. Disponible real (incluyendo tu apartado previo): {totalAvailableForThis}");
                    }

                    var finalPrice = item.UnitPrice ?? product.Price;
                    var subtotal = finalPrice * item.Quantity;
                    var tax = subtotal * (product.IvaRate + product.IepsRate);
                    
                    total += subtotal + tax;
                    totalTax += tax;
                    totalCost += product.Cost * item.Quantity;
                    totalWeight += product.Weight * item.Quantity;
    
                    _context.OrderItems.Add(new OrderItem
                    {
                        Order = order,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = finalPrice
                    });

                    var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == warehouse.Id);
                    if (inventory == null) {
                        inventory = new ProductInventory { ProductId = product.Id, WarehouseId = warehouse.Id };
                        _context.ProductInventories.Add(inventory);
                    }
                    inventory.CommittedStock += item.Quantity;
                }
            }

            order.TotalAmount = total;
            order.TotalTax = totalTax;
            order.TotalCost = totalCost;
            order.TotalWeight = totalWeight;
            
            order.PhotoBase64 = !string.IsNullOrEmpty(input.PhotoBase64) && input.PhotoBase64.Contains(",") 
                ? SaveImage(input.PhotoBase64, "orders") 
                : order.PhotoBase64;
            
            order.PaymentMethod = input.PaymentMethod;

            if (order.PaymentMethod == "Crédito")
            {
                if (client.HasOverdueDebt || (client.CurrentBalance + total > client.CreditLimit))
                {
                    order.Status = "Esperando Autorización Admin";
                    order.NeedsAdminApproval = true;
                    order.AdminApprovalReason = client.HasOverdueDebt ? "Cartera Vencida" : "Excede Límite de Crédito";
                }
                else 
                {
                    order.Status = "Pendiente";
                    order.NeedsAdminApproval = false;
                    order.AdminApprovalReason = null;
                }
                client.CurrentBalance += total;
            }
            else 
            {
                order.Status = "Pendiente";
                order.NeedsAdminApproval = false;
                order.AdminApprovalReason = null;
            }

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
    [HttpPost("order/{id}/approve-credit")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> ApproveCredit(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            if (!order.NeedsAdminApproval) return BadRequest("El pedido no requiere autorización.");

            order.NeedsAdminApproval = false;
            order.IsApprovedByAdmin = true;
            order.Status = "Pendiente";
            
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("authorize-order/{id}")]
        public async Task<IActionResult> AuthorizeOrder(int id)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("Invalid user token.");
            var userId = int.Parse(userIdString);

            try
            {
                var order = await _orderService.AuthorizeOrderAsync(id, userId);
                if (order == null) return NotFound("Order not found");
                return Ok(order);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
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

            // Lógica PEPS (Primeras Entradas, Primeras Salidas)
            foreach (var item in order.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    // Descontar el stock (Nota: esto debería ser gestionado en AuthorizeOrder y no aquí para evitar doble descuento)
                    // product.CommittedStock -= item.Quantity;
                    // product.Stock -= item.Quantity;

                    // Descontar de los lotes usando PEPS
                    var batches = await _context.ProductBatches
                        .Where(b => b.ProductId == product.Id && b.Quantity > 0)
                        .OrderBy(b => b.ExpirationDate) // PEPS: los más próximos a caducar salen primero
                        .ToListAsync();
                        
                    int remainingToFulfill = item.Quantity;
                    foreach (var batch in batches)
                    {
                        if (remainingToFulfill <= 0) break;
                        
                        if (batch.Quantity >= remainingToFulfill)
                        {
                            batch.Quantity -= remainingToFulfill;
                            remainingToFulfill = 0;
                        }
                        else
                        {
                            remainingToFulfill -= batch.Quantity;
                            batch.Quantity = 0;
                        }
                    }
                    
                    // Log the movement
                    var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    int userId = string.IsNullOrEmpty(userIdString) ? 0 : int.Parse(userIdString);
                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductId = product.Id,
                        Quantity = item.Quantity,
                        Type = "Salida",
                        Reason = "Venta",
                        Date = DateTime.Now,
                        UserId = userId,
                        Reference = $"Pedido: {order.OrderNumber}",
                        UnitCost = product.AverageCost > 0 ? product.AverageCost : product.Cost,
                        AverageCost = product.AverageCost > 0 ? product.AverageCost : product.Cost
                    });
                }
            }
            
            await _context.SaveChangesAsync();
            return Ok(order);
        }

    [HttpPost("order/{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string status)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("Invalid user token.");
            var userId = int.Parse(userIdString);

            try
            {
                var order = await _orderService.UpdateOrderStatusAsync(id, status, userId);
                if (order == null) return NotFound("Order not found");
                return Ok(order);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

    [HttpPost("order/{id}/fulfill")]
        public async Task<IActionResult> FulfillOrder(int id, [FromBody] FulfillOrderInput input)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = int.Parse(userIdString);

            var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
            if (order == null) return NotFound("Order not found");

            order.VehicleId = input.VehicleId;

            foreach (var inputItem in input.Items)
            {
                var existingItem = order.Items.FirstOrDefault(i => i.ProductId == inputItem.ProductId);
                if (existingItem != null)
                {
                    int difference = existingItem.Quantity - inputItem.FulfillQuantity;
                    if(difference > 0) 
                    {
                        var product = await _context.Products.FindAsync(inputItem.ProductId);
                        if(product != null) 
                        {
                            var route = await _context.Routes.FindAsync(order.RouteId);
                            if (route != null) 
                            {
                                var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId && w.Type == "Principal") 
                                        ?? await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId)
                                        ?? await _context.Warehouses.FirstAsync();

                                var inventory = await _context.ProductInventories
                                    .FirstOrDefaultAsync(inv => inv.ProductId == product.Id && inv.WarehouseId == warehouse.Id);

                                if(inventory != null) {
                                    inventory.CommittedStock -= difference;
                                    if(inventory.CommittedStock < 0) inventory.CommittedStock = 0;
                                }
                            }
                        }
                    }
                    existingItem.Quantity = inputItem.FulfillQuantity;
                }
            }

            var itemsToRemove = order.Items.Where(i => i.Quantity <= 0).ToList();
            if(itemsToRemove.Any()) {
                _context.OrderItems.RemoveRange(itemsToRemove);
            }
            
            decimal total = 0;
            decimal totalTax = 0;
            decimal totalCost = 0;
            decimal totalWeight = 0;

            foreach (var item in order.Items.Where(i => i.Quantity > 0))
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if(product != null) {
                    var subtotal = item.UnitPrice * item.Quantity;
                    var tax = subtotal * (product.IvaRate + product.IepsRate);
                    
                    total += subtotal + tax;
                    totalTax += tax;
                    totalCost += product.Cost * item.Quantity;
                    totalWeight += product.Weight * item.Quantity;
                }
            }

            order.TotalAmount = total;
            order.TotalTax = totalTax;
            order.TotalCost = totalCost;
            order.TotalWeight = totalWeight;

            await _context.SaveChangesAsync();

            await _orderService.UpdateOrderStatusAsync(order.Id, "Surtido/En Tránsito", userId);
            
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
                    var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == 1);
                    if (inventory != null) inventory.Stock += ret.Quantity;
                    else _context.ProductInventories.Add(new ProductInventory { ProductId = product.Id, WarehouseId = 1, Stock = ret.Quantity });
                    
                    var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    if (string.IsNullOrEmpty(userIdString)) return Unauthorized("Invalid user token.");
                            var userId = int.Parse(userIdString);

                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductId = product.Id,
                        Quantity = ret.Quantity,
                        Type = "Entrada",
                        Reason = "Devolución a Almacén",
                        Date = DateTime.Now,
                        UserId = userId,
                        Reference = $"Retorno-{id}"
                    });
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
