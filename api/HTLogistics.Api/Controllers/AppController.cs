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
[Route("api/[controller]")]
[Authorize]
public class AppController : ControllerBase
{
    private readonly AppDbContext _context;

    public AppController(AppDbContext context)
    {
        _context = context;
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

    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        var branches = await _context.Branches.ToListAsync();
        var warehouses = await _context.Warehouses.ToListAsync();
        var drivers = await _context.Drivers.ToListAsync();
        
        var routes = await _context.Routes
            .Include(r => r.Clients)
            .ToListAsync();
            
        var products = await _context.Products.Include(p => p.Images).ToListAsync();
        
        var orders = await _context.Orders
            .Include(o => o.Items)
            .ToListAsync();
            
        var purchaseOrders = await _context.PurchaseOrders.ToListAsync();
        var providers = await _context.Providers.ToListAsync();
        var clientPrices = await _context.ClientPrices.ToListAsync();
        var returns = await _context.OrderReturns.ToListAsync();
        var expenses = await _context.Expenses.ToListAsync();
        var expenseCategories = await _context.ExpenseCategories.ToListAsync();
        var vehicles = await _context.Vehicles.ToListAsync();
        var cashClosures = await _context.CashClosures.ToListAsync();
        var productCategories = await _context.ProductCategories.ToListAsync();
        
        List<User>? users = null;
        if (User.IsInRole("Admin"))
        {
            users = await _context.Users.ToListAsync();
        }

        return Ok(new
        {
            sucursales = branches,
            almacenes = warehouses,
            vendedores = drivers,
            rutas = routes,
            productos = products,
            pedidos = orders,
            compras = purchaseOrders,
            proveedores = providers,
            preciosEspeciales = clientPrices,
            devoluciones = returns,
            gastos = expenses,
            categoriasGastos = expenseCategories,
            unidades = vehicles,
            cierresCaja = cashClosures,
            usuarios = users
        });
    }

    [HttpGet("reports")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetReports()
    {
        var sales = await _context.Orders
            .Where(o => o.Status == "Entregado" || o.Status == "Entregado con Devolución")
            .Select(o => new {
                o.OrderNumber,
                o.TotalAmount,
                o.TotalCost,
                Margin = o.TotalAmount - o.TotalCost,
                MarginPercentage = o.TotalAmount > 0 ? (o.TotalAmount - o.TotalCost) / o.TotalAmount * 100 : 0
            }).ToListAsync();

        var expiringSoon = await _context.ProductBatches
            .Include(b => b.Product)
            .Where(b => b.Quantity > 0 && b.ExpirationDate <= DateTime.Now.AddMonths(3))
            .OrderBy(b => b.ExpirationDate)
            .ToListAsync();

        var inventoryValue = await _context.Products
            .Select(p => new {
                p.Name,
                p.Stock,
                p.Cost,
                TotalValue = p.Stock * p.Cost
            }).ToListAsync();

        return Ok(new
        {
            ventasMargen = sales,
            riesgoMerma = expiringSoon,
            valorInventario = inventoryValue,
            totalUtilidad = sales.Sum(s => s.Margin)
        });
    }

    [HttpGet("loading-sheet/{routeId}")]
    public async Task<IActionResult> GetLoadingSheet(int routeId)
    {
        var pendingOrders = await _context.Orders
            .Where(o => o.RouteId == routeId && (o.Status == "Pendiente" || o.Status == "En remisión"))
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .ToListAsync();

        var consolidatedItems = pendingOrders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.Product!.Name, i.Product.SKU })
            .Select(g => new
            {
                g.Key.SKU,
                g.Key.Name,
                TotalQuantity = g.Sum(i => i.Quantity)
            })
            .OrderBy(x => x.Name)
            .ToList();

        return Ok(consolidatedItems);
    }

    [HttpPost("product")]
    public async Task<IActionResult> CreateProduct([FromBody] ProductInputModel input)
    {
        var prod = new Product 
        { 
            Name = input.Name, 
            Price = input.Price, 
            Stock = input.Stock, 
            WarehouseId = input.WarehouseId, 
            SKU = input.SKU,
            BoxPrice = input.BoxPrice,
            UnitsPerBox = input.UnitsPerBox,
            VolumePrice = input.VolumePrice
        };
        
        if (input.Photos != null)
        {
            foreach (var photo in input.Photos)
            {
                prod.Images.Add(new ProductImage { PhotoBase64 = photo });
            }
        }

        _context.Products.Add(prod);
        await _context.SaveChangesAsync();
        return Ok(prod);
    }

    [HttpPut("product/{id}")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductInputModel input)
    {
        var prod = await _context.Products.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
        if (prod == null) return NotFound();

        prod.Name = input.Name;
        prod.Price = input.Price;
        prod.Stock = input.Stock;
        prod.WarehouseId = input.WarehouseId;
        prod.SKU = input.SKU;
        prod.BoxPrice = input.BoxPrice;
        prod.UnitsPerBox = input.UnitsPerBox;
        prod.VolumePrice = input.VolumePrice;

        if (input.Photos != null && input.Photos.Any())
        {
            _context.ProductImages.RemoveRange(prod.Images);
            foreach (var photo in input.Photos)
            {
                prod.Images.Add(new ProductImage { PhotoBase64 = photo });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(prod);
    }

    [HttpPost("provider")]
    public async Task<IActionResult> CreateProvider([FromBody] ProviderInputModel input)
    {
        var prov = new Provider { Name = input.Name, Contact = input.Contact, Phone = input.Phone };
        _context.Providers.Add(prov);
        await _context.SaveChangesAsync();
        return Ok(prov);
    }

    [HttpPut("provider/{id}")]
    public async Task<IActionResult> UpdateProvider(int id, [FromBody] ProviderInputModel input)
    {
        var prov = await _context.Providers.FindAsync(id);
        if (prov == null) return NotFound();
        prov.Name = input.Name;
        prov.Contact = input.Contact;
        prov.Phone = input.Phone;
        await _context.SaveChangesAsync();
        return Ok(prov);
    }

    [HttpPost("client")]
    public async Task<IActionResult> CreateClient([FromBody] ClientInputModel input)
    {
        var cli = new Client { Name = input.Name, Zone = input.Zone, RouteId = input.RouteId, Latitude = input.Latitude, Longitude = input.Longitude, IsVisited = false };
        _context.Clients.Add(cli);
        await _context.SaveChangesAsync();
        return Ok(cli);
    }

    [HttpPut("client/{id}")]
    public async Task<IActionResult> UpdateClient(int id, [FromBody] ClientInputModel input)
    {
        var cli = await _context.Clients.FindAsync(id);
        if (cli == null) return NotFound();
        cli.Name = input.Name;
        cli.Zone = input.Zone;
        cli.RouteId = input.RouteId;
        cli.Latitude = input.Latitude;
        cli.Longitude = input.Longitude;
        await _context.SaveChangesAsync();
        return Ok(cli);
    }

    [HttpPost("expense-category")]
    public async Task<IActionResult> CreateExpenseCategory([FromBody] ExpenseCategoryInputModel input)
    {
        var cat = new ExpenseCategory { Name = input.Name };
        _context.ExpenseCategories.Add(cat);
        await _context.SaveChangesAsync();
        return Ok(cat);
    }

    [HttpPost("expense")]
    public async Task<IActionResult> CreateExpense([FromBody] ExpenseInputModel input)
    {
        var expense = new Expense 
        { 
            ProviderId = input.ProviderId,
            ExpenseCategoryId = input.ExpenseCategoryId,
            Concept = input.Concept,
            Amount = input.Amount,
            Date = DateTime.Now,
            ReferenceNumber = input.ReferenceNumber,
            IsPaid = input.IsPaid
        };
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpPost("branch")]
    public async Task<IActionResult> CreateBranch([FromBody] BranchInputModel input)
    {
        var branch = new Branch { Name = input.Name, Zone = input.Zone, Manager = input.Manager };
        _context.Branches.Add(branch);
        await _context.SaveChangesAsync();
        return Ok(branch);
    }

    [HttpPost("warehouse")]
    public async Task<IActionResult> CreateWarehouse([FromBody] WarehouseInputModel input)
    {
        var warehouse = new Warehouse { Name = input.Nombre, BranchId = input.SucursalId, Type = input.Tipo, Manager = input.Responsable, IsActive = true };
        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();
        return Ok(warehouse);
    }

    [HttpPost("driver")]
    public async Task<IActionResult> CreateDriver([FromBody] DriverInputModel input)
    {
        var driver = new Driver 
        { 
            Name = input.Nombre, 
            Phone = input.Telefono, 
            VehicleId = input.VehiculoId, // Changed from AssignedVehicleId
            BranchId = input.SucursalId, 
            Status = "Activo",
            CommissionPercentage = input.Comision // New field
        };
        _context.Drivers.Add(driver);
        await _context.SaveChangesAsync();
        return Ok(driver);
    }

    [HttpPost("vehicle")]
    public async Task<IActionResult> CreateVehicle([FromBody] VehicleInputModel input)
    {
        var vehicle = new Vehicle { PlateNumber = input.Placas, Model = input.Modelo, Brand = input.Marca, Status = "Disponible" };
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return Ok(vehicle);
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

    [HttpPost("route")]
    public async Task<IActionResult> CreateRoute([FromBody] RouteInputModel input)
    {
        var route = new DeliveryRoute { Name = input.Nombre, DayOfWeek = input.Dia, BranchId = input.SucursalId, DriverId = input.VendedorId };
        _context.Routes.Add(route);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(input.ClientesText))
        {
            var names = input.ClientesText.Split(',');
            foreach (var n in names)
            {
                var trimmed = n.Trim();
                if (!string.IsNullOrEmpty(trimmed))
                {
                    _context.Clients.Add(new Client { Name = trimmed, Zone = "Zona general", IsVisited = false, RouteId = route.Id, Latitude = 21.1, Longitude = -101.6 });
                }
            }
            await _context.SaveChangesAsync();
        }
        return Ok(route);
    }

    [HttpPost("purchase-order")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] PurchaseOrderInputModel input)
    {
        var po = new PurchaseOrder 
        { 
            PoNumber = "OC-" + new Random().Next(1000, 9999), 
            ProviderId = input.ProviderId, 
            ProductId = input.ProductoId, 
            Quantity = input.Cantidad, 
            Cost = input.Costo, 
            Status = "Borrador",
            BatchNumber = input.Lote,
            ExpirationDate = input.Caducidad
        };
        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPost("purchase-order/{id}/apply")]
    public async Task<IActionResult> ApplyPurchaseOrder(int id)
    {
        var po = await _context.PurchaseOrders.FindAsync(id);
        if (po == null) return NotFound();
        
        po.Status = "Compra definitiva";
        var product = await _context.Products.FindAsync(po.ProductId);
        if (product != null)
        {
            // Simple Weighted Average Cost update (optional, using last cost for now as requested for simplicity)
            product.Cost = po.Cost;
            product.Stock += po.Quantity;

            // Add to batch
            _context.ProductBatches.Add(new ProductBatch
            {
                ProductId = product.Id,
                BatchNumber = po.BatchNumber ?? "S/L",
                ExpirationDate = po.ExpirationDate ?? DateTime.Now.AddMonths(12),
                Quantity = po.Quantity,
                EntryDate = DateTime.Now
            });

            // Log movement
            _context.InventoryMovements.Add(new InventoryMovement
            {
                ProductId = product.Id,
                Quantity = po.Quantity,
                Type = "Entrada",
                Reason = "Compra",
                Date = DateTime.Now,
                UserId = 1,
                Reference = po.PoNumber
            });
        }
        await _context.SaveChangesAsync();
        return Ok(po);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginInputModel input)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == input.Email && u.Password == input.Password);
        if (user == null) return Unauthorized(new { message = "Credenciales incorrectas" });
        
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes("SuperSecretKeyForHTLogistica2026!");
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email!),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = "HTLogistics",
            Audience = "HTLogisticsClient",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        
        return Ok(new {
            token = tokenHandler.WriteToken(token),
            user = new { user.Id, user.Name, user.Email, user.Role, user.ClientId, SucursalId = input.SucursalId }
        });
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



    [HttpPost("order/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string status)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound("Order not found");
        order.Status = status;
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

    [HttpPut("products/bulk")]
    [Authorize(Roles = "Admin,Almacenista")]
    public async Task<IActionResult> UpdateBulkProducts([FromBody] List<ProductBulkUpdateModel> updates)
    {
        foreach (var up in updates)
        {
            var p = await _context.Products.FindAsync(up.Id);
            if (p != null)
            {
                if (up.Price.HasValue) p.Price = up.Price.Value;
                if (up.Stock.HasValue) p.Stock = up.Stock.Value;
                if (up.Cost.HasValue) p.Cost = up.Cost.Value;
            }
        }
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("visit")]
    public async Task<IActionResult> RecordVisit([FromBody] VisitInputModel input)
    {
        var visit = new Visit
        {
            ClientId = input.ClientId,
            DriverId = input.DriverId,
            Date = DateTime.Now,
            SaleAccomplished = input.SaleAccomplished,
            NoSaleReason = input.NoSaleReason,
            Latitude = input.Latitude,
            Longitude = input.Longitude
        };

        if (input.SaleAccomplished)
        {
            var client = await _context.Clients.FindAsync(input.ClientId);
            if (client != null) client.IsVisited = true;
        }

        _context.Visits.Add(visit);
        await _context.SaveChangesAsync();
        return Ok(visit);
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
        user.SucursalId = input.SucursalId;
        user.ClientId = input.ClientId;
        
        await _context.SaveChangesAsync();
        return Ok(user);
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

public class DeliveryInputModel
{
    public int OrderId { get; set; }
    public string? PhotoBase64 { get; set; }
}

public class IncidentInputModel
{
    public int DriverId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class OrderInputModel
{
    public int ClientId { get; set; }
    public int RouteId { get; set; }
    public int DriverId { get; set; }
    public string? PhotoBase64 { get; set; }
    public string PaymentMethod { get; set; } = "Contado";
    public List<OrderItemInput> Items { get; set; } = new();
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class OrderItemInput
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class DriverInputModel
{
    public required string Nombre { get; set; }
    public string? Telefono { get; set; }
    public int? VehiculoId { get; set; }
    public int SucursalId { get; set; }
    public decimal Comision { get; set; }
}

public class VehicleInputModel
{
    public required string Placas { get; set; }
    public required string Modelo { get; set; }
    public required string Marca { get; set; }
}

public class CashClosureInputModel
{
    public int DriverId { get; set; }
    public int RouteId { get; set; }
    public decimal TotalExpected { get; set; }
    public decimal TotalReceived { get; set; }
    public string? Observations { get; set; }
}

public class ProductInputModel
{
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public int WarehouseId { get; set; }
    public string? SKU { get; set; }
    public List<string>? Photos { get; set; }
    public decimal BoxPrice { get; set; }
    public int UnitsPerBox { get; set; }
    public decimal VolumePrice { get; set; }
}

public class ProviderInputModel
{
    public required string Name { get; set; }
    public required string Contact { get; set; }
    public required string Phone { get; set; }
}

public class ClientInputModel
{
    public required string Name { get; set; }
    public required string Zone { get; set; }
    public int RouteId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class OrderReturnBatchInput
{
    public int OrderId { get; set; }
    public List<OrderReturnInputModel> Returns { get; set; } = new();
}

public class OrderReturnInputModel
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public required string Reason { get; set; }
}

public class ReturnAuthorizeInputModel
{
    public bool IsWaste { get; set; }
}

public class ExpenseCategoryInputModel
{
    public required string Name { get; set; }
}

public class ExpenseInputModel
{
    public int? ProviderId { get; set; }
    public int ExpenseCategoryId { get; set; }
    public required string Concept { get; set; }
    public decimal Amount { get; set; }
    public string? ReferenceNumber { get; set; }
    public bool IsPaid { get; set; }
}

public class VisitInputModel
{
    public int ClientId { get; set; }
    public int DriverId { get; set; }
    public bool SaleAccomplished { get; set; }
    public string? NoSaleReason { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class PaymentInputModel
{
    public int ClientId { get; set; }
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string? PaymentMethod { get; set; }
}

public class CashClosureDeclareInput
{
    public int ClosureId { get; set; }
    public decimal TotalDeclared { get; set; }
    public string? Observations { get; set; }
}

public class ProductBulkUpdateModel
{
    public int Id { get; set; }
    public decimal? Price { get; set; }
    public int? Stock { get; set; }
    public decimal? Cost { get; set; }
}
public class UserInputModel
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Password { get; set; }
    public required string Role { get; set; }
    public int? SucursalId { get; set; }
    public int? ClientId { get; set; }
}
