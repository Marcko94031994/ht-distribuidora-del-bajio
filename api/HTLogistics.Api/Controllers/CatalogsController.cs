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
public class CatalogsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public CatalogsController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
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

    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis()
    {
        var branches = await _context.Branches.CountAsync();
        var warehouses = await _context.Warehouses.CountAsync();
        var routes = await _context.Routes.CountAsync();
        var orders = await _context.Orders.CountAsync();
        var pendingOrders = await _context.Orders.CountAsync(o => o.Status == "Pendiente");
        
        return Ok(new { suc = branches, alm = warehouses, rutas = routes, ped = orders, pend = pendingOrders });
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

}
