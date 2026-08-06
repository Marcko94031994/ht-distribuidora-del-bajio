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
        var branches = await _context.Branches.AsNoTracking().ToListAsync();
        var warehouses = await _context.Warehouses.AsNoTracking().ToListAsync();
        var drivers = await _context.Drivers.AsNoTracking().ToListAsync();
        
        var routes = await _context.Routes
            .AsNoTracking()
            .Include(r => r.Clients)
            .ToListAsync();
            
        var clients = await _context.Clients.AsNoTracking().ToListAsync();
        var purchaseOrders = await _context.PurchaseOrders
            .AsNoTracking()
            .Include(po => po.Details)
            .OrderByDescending(po => po.Id)
            .Take(500)
            .ToListAsync();

        var providers = await _context.Providers.AsNoTracking().ToListAsync();
        var providerPayments = await _context.ProviderPayments.AsNoTracking().ToListAsync();
        var clientPayments = await _context.ClientPayments.AsNoTracking().ToListAsync();
        var clientPrices = await _context.ClientPrices.AsNoTracking().ToListAsync();
        var returns = await _context.OrderReturns.AsNoTracking().ToListAsync();
        var expenses = await _context.Expenses.AsNoTracking().OrderByDescending(e => e.Id).Take(500).ToListAsync();
        var expenseCategories = await _context.ExpenseCategories.AsNoTracking().ToListAsync();
        var vehicles = await _context.Vehicles.AsNoTracking().ToListAsync();
        var cashClosures = await _context.CashClosures.AsNoTracking().OrderByDescending(c => c.Id).Take(200).ToListAsync();
        var productCategories = await _context.ProductCategories.AsNoTracking().ToListAsync();
        var productBrands = await _context.ProductBrands.AsNoTracking().ToListAsync();
        var warehouseLocations = await _context.WarehouseLocations.AsNoTracking().ToListAsync();
        
        List<User>? users = null;
        if (User.IsInRole("Admin"))
        {
            users = await _context.Users.AsNoTracking().ToListAsync();
        }

        return Ok(new
        {
            sucursales = branches,
            almacenes = warehouses,
            ubicaciones = warehouseLocations,
            vendedores = drivers,
            rutas = routes,
            clientes = clients,
            compras = purchaseOrders,
            proveedores = providers,
            pagosProveedores = providerPayments,
            pagosClientes = clientPayments,
            preciosEspeciales = clientPrices,
            devoluciones = returns,
            gastos = expenses,
            categoriasGastos = expenseCategories,
            unidades = vehicles,
            cierresCaja = cashClosures,
            usuarios = users,
            categorias = productCategories,
            marcas = productBrands
        });
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis()
    {
        var branches = await _context.Branches.AsNoTracking().CountAsync();
        var warehouses = await _context.Warehouses.AsNoTracking().CountAsync();
        var routes = await _context.Routes.AsNoTracking().CountAsync();
        var orders = await _context.Orders.AsNoTracking().CountAsync();
        var pendingOrders = await _context.Orders.AsNoTracking().CountAsync(o => o.Status == "Pendiente");
        
        return Ok(new { suc = branches, alm = warehouses, rutas = routes, ped = orders, pend = pendingOrders });
    }

    [HttpGet("reports")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetReports()
    {
        var sales = await _context.Orders
            .AsNoTracking()
            .Where(o => o.Status == "Entregado" || o.Status == "Entregado con Devolución")
            .Select(o => new {
                o.OrderNumber,
                o.TotalAmount,
                o.TotalCost,
                Margin = o.TotalAmount - o.TotalCost,
                MarginPercentage = o.TotalAmount > 0 ? (o.TotalAmount - o.TotalCost) / o.TotalAmount * 100 : 0
            }).ToListAsync();

        var expiringSoon = await _context.ProductBatches
            .AsNoTracking()
            .Include(b => b.Product)
            .Where(b => b.Quantity > 0 && b.ExpirationDate <= DateTime.Now.AddMonths(3))
            .OrderBy(b => b.ExpirationDate)
            .ToListAsync();

        var inventoryValue = await _context.Products
            .AsNoTracking()
            .Select(p => new {
                p.Name,
                Stock = p.TotalStock,
                p.Cost,
                TotalValue = p.TotalStock * p.Cost
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

    [HttpPut("branch/{id}")]
    public async Task<IActionResult> UpdateBranch(int id, [FromBody] BranchInputModel input)
    {
        var branch = await _context.Branches.FindAsync(id);
        if (branch == null) return NotFound();
        branch.Name = input.Name;
        branch.Zone = input.Zone;
        branch.Manager = input.Manager;
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

    [HttpPut("warehouse/{id}")]
    public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] WarehouseInputModel input)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null) return NotFound();
        warehouse.Name = input.Nombre;
        warehouse.BranchId = input.SucursalId;
        warehouse.Type = input.Tipo;
        warehouse.Manager = input.Responsable;
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
                VehicleId = input.VehiculoId,
                BranchId = input.SucursalId, 
                Status = input.Status ?? "Activo",
                CommissionPercentage = input.Comision
            };
            _context.Drivers.Add(driver);
            await _context.SaveChangesAsync();
            return Ok(driver);
        }

    [HttpPut("driver/{id}")]
        public async Task<IActionResult> UpdateDriver(int id, [FromBody] DriverInputModel input)
        {
            var driver = await _context.Drivers.FindAsync(id);
            if (driver == null) return NotFound();
            driver.Name = input.Nombre;
            driver.Phone = input.Telefono;
            driver.VehicleId = input.VehiculoId;
            driver.BranchId = input.SucursalId;
            driver.CommissionPercentage = input.Comision;
            if (!string.IsNullOrEmpty(input.Status)) driver.Status = input.Status;
            await _context.SaveChangesAsync();
            return Ok(driver);
        }

    [HttpPost("vehicle")]
        public async Task<IActionResult> CreateVehicle([FromBody] VehicleInputModel input)
        {
            var vehicle = new Vehicle { PlateNumber = input.Placas, Model = input.Modelo, Brand = input.Marca, Status = input.Estatus ?? "Disponible" };
            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();
            return Ok(vehicle);
        }

    [HttpPut("vehicle/{id}")]
        public async Task<IActionResult> UpdateVehicle(int id, [FromBody] VehicleInputModel input)
        {
            var vehicle = await _context.Vehicles.FindAsync(id);
            if (vehicle == null) return NotFound();
            vehicle.PlateNumber = input.Placas;
            vehicle.Model = input.Modelo;
            vehicle.Brand = input.Marca;
            if (!string.IsNullOrEmpty(input.Estatus)) vehicle.Status = input.Estatus;
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

    [HttpPut("route/{id}")]
    public async Task<IActionResult> UpdateRoute(int id, [FromBody] RouteInputModel input)
    {
        var route = await _context.Routes.FindAsync(id);
        if (route == null) return NotFound();
        route.Name = input.Nombre;
        route.DayOfWeek = input.Dia;
        route.BranchId = input.SucursalId;
        route.DriverId = input.VendedorId;
        await _context.SaveChangesAsync();
        return Ok(route);
    }

    [HttpPost("provider")]
        public async Task<IActionResult> CreateProvider([FromBody] ProviderInputModel input)
        {
            var prov = new Provider { Name = input.Name, Contact = input.Contact, Phone = input.Phone, RFC = input.RFC, Address = input.Address };
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
            prov.RFC = input.RFC;
            prov.Address = input.Address;
            await _context.SaveChangesAsync();
            return Ok(prov);
        }

    [HttpPost("provider-payment")]
        public async Task<IActionResult> RegisterProviderPayment([FromBody] ProviderPaymentInputModel input)
        {
            var provider = await _context.Providers.FindAsync(input.ProviderId);
            if (provider == null) return NotFound("Provider not found");

            decimal totalPaidAmount = input.Amount;

            if (input.PurchaseOrderPayments != null && input.PurchaseOrderPayments.Count > 0)
            {
                decimal sumAllocated = 0;
                foreach (var item in input.PurchaseOrderPayments)
                {
                    if (item.Amount <= 0) continue;
                    var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == item.PurchaseOrderId && p.ProviderId == input.ProviderId);
                    if (po != null)
                    {
                        po.AmountPaid += item.Amount;
                        if (po.AmountPaid > po.TotalAmount) po.AmountPaid = po.TotalAmount;
                        sumAllocated += item.Amount;
                    }
                }
                if (totalPaidAmount <= 0 || sumAllocated > 0)
                {
                    totalPaidAmount = sumAllocated;
                }
            }
            else
            {
                // FIFO logic fallback
                var pendingPOs = await _context.PurchaseOrders
                    .Where(po => po.ProviderId == input.ProviderId && po.AmountPaid < po.TotalAmount)
                    .OrderBy(po => po.Date)
                    .ToListAsync();

                decimal remainingPayment = input.Amount;
                foreach(var po in pendingPOs)
                {
                    if (remainingPayment <= 0) break;
                    
                    decimal debt = po.TotalAmount - po.AmountPaid;
                    if (remainingPayment >= debt)
                    {
                        po.AmountPaid = po.TotalAmount;
                        remainingPayment -= debt;
                    }
                    else
                    {
                        po.AmountPaid += remainingPayment;
                        remainingPayment = 0;
                    }
                }
            }

            var payment = new ProviderPayment
            {
                ProviderId = input.ProviderId,
                Amount = totalPaidAmount,
                Reference = input.Reference,
                PaymentMethod = input.PaymentMethod,
                Date = DateTime.Now
            };

            provider.CurrentBalance -= totalPaidAmount;
            if (provider.CurrentBalance < 0) provider.CurrentBalance = 0;
            
            _context.ProviderPayments.Add(payment);
            await _context.SaveChangesAsync();

            return Ok(payment);
        }

    [HttpPost("client")]
        public async Task<IActionResult> CreateClient([FromBody] ClientInputModel input)
        {
            var cli = new Client { 
                Name = input.Name, 
                Zone = input.Zone, 
                RouteId = input.RouteId, 
                Latitude = input.Latitude, 
                Longitude = input.Longitude, 
                IsVisited = false,
                CreditLimit = input.CreditLimit,
                CreditDays = input.CreditDays,
                RFC = input.RFC,
                RazonSocial = input.RazonSocial,
                RegimenFiscal = input.RegimenFiscal,
                CodigoPostal = input.CodigoPostal,
                FormaPago = input.FormaPago,
                MetodoPago = input.MetodoPago,
                UsoCFDI = input.UsoCFDI,
                Telefonos = input.Telefonos,
                Celular = input.Celular,
                Email1 = input.Email1,
                Email2 = input.Email2,
                Email3 = input.Email3,
                Colonia = input.Colonia,
                Localidad = input.Localidad,
                Municipio = input.Municipio,
                Referencia = input.Referencia,
                IsBlocked = input.IsBlocked
            };
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
            cli.CreditLimit = input.CreditLimit;
            cli.CreditDays = input.CreditDays;
            cli.RFC = input.RFC;
            cli.RazonSocial = input.RazonSocial;
            cli.RegimenFiscal = input.RegimenFiscal;
            cli.CodigoPostal = input.CodigoPostal;
            cli.FormaPago = input.FormaPago;
            cli.MetodoPago = input.MetodoPago;
            cli.UsoCFDI = input.UsoCFDI;
            cli.Telefonos = input.Telefonos;
            cli.Celular = input.Celular;
            cli.Email1 = input.Email1;
            cli.Email2 = input.Email2;
            cli.Email3 = input.Email3;
            cli.Colonia = input.Colonia;
            cli.Localidad = input.Localidad;
            cli.Municipio = input.Municipio;
            cli.Referencia = input.Referencia;
            cli.IsBlocked = input.IsBlocked;
            await _context.SaveChangesAsync();
            return Ok(cli);
        }

    [HttpPost("client-price")]
        [Authorize(Roles = "Admin,Vendedor,Supervisor")]
        public async Task<IActionResult> SetClientPrice([FromBody] ClientPriceInputModel input)
        {
            var existing = await _context.ClientPrices
                .FirstOrDefaultAsync(cp => cp.ClientId == input.ClientId && cp.ProductId == input.ProductId);
            
            if (existing != null)
            {
                existing.SpecialPrice = input.SpecialPrice;
            }
            else
            {
                existing = new ClientPrice
                {
                    ClientId = input.ClientId,
                    ProductId = input.ProductId,
                    SpecialPrice = input.SpecialPrice
                };
                _context.ClientPrices.Add(existing);
            }
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

    [HttpDelete("client-price/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClientPrice(int id)
        {
            var cp = await _context.ClientPrices.FindAsync(id);
            if (cp == null) return NotFound();
            _context.ClientPrices.Remove(cp);
            await _context.SaveChangesAsync();
            return Ok();
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

    [HttpPost("simulate-active-routes")]
    public async Task<IActionResult> SimulateActiveRoutes()
    {
        // 1. Obtener o crear sucursal
        var branch = await _context.Branches.FirstOrDefaultAsync();
        if (branch == null)
        {
            branch = new Branch { Name = "Matriz Bajío", Zone = "León", Manager = "Gerencia Bajío" };
            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();
        }

        // 2. Obtener o crear 3 Choferes / Vendedores
        var d1 = await _context.Drivers.FirstOrDefaultAsync(d => d.Name.Contains("Juan Pérez"));
        if (d1 == null)
        {
            d1 = new Driver { Name = "Juan Pérez (R-101)", Phone = "4771234567", Status = "En Ruta", BranchId = branch.Id, CommissionPercentage = 3.5m };
            _context.Drivers.Add(d1);
        }
        d1.Latitude = 21.1218;
        d1.Longitude = -101.6825;
        d1.Status = "En Ruta";
        d1.HasIncident = false;
        d1.IncidentReason = null;

        var d2 = await _context.Drivers.FirstOrDefaultAsync(d => d.Name.Contains("Carlos Mendoza"));
        if (d2 == null)
        {
            d2 = new Driver { Name = "Carlos Mendoza (R-102)", Phone = "4779876543", Status = "En Ruta", BranchId = branch.Id, CommissionPercentage = 3.5m };
            _context.Drivers.Add(d2);
        }
        d2.Latitude = 21.0985;
        d2.Longitude = -101.6380;
        d2.Status = "En Ruta";
        d2.HasIncident = false;
        d2.IncidentReason = null;

        var d3 = await _context.Drivers.FirstOrDefaultAsync(d => d.Name.Contains("Roberto Ruiz"));
        if (d3 == null)
        {
            d3 = new Driver { Name = "Roberto Ruiz (R-103)", Phone = "4775551234", Status = "En Ruta", BranchId = branch.Id, CommissionPercentage = 3.5m };
            _context.Drivers.Add(d3);
        }
        d3.Latitude = 21.1520;
        d3.Longitude = -101.6980;
        d3.Status = "En Ruta";
        d3.HasIncident = false;
        d3.IncidentReason = null;

        await _context.SaveChangesAsync();

        // 3. Crear / Configurar 3 Rutas
        var r1 = await _context.Routes.FirstOrDefaultAsync(r => r.Name.Contains("R-101"));
        if (r1 == null)
        {
            r1 = new DeliveryRoute { Name = "R-101: Centro Histórico - San Juan", DayOfWeek = "Jueves", BranchId = branch.Id, DriverId = d1.Id };
            _context.Routes.Add(r1);
        }
        else { r1.DriverId = d1.Id; }

        var r2 = await _context.Routes.FirstOrDefaultAsync(r => r.Name.Contains("R-102"));
        if (r2 == null)
        {
            r2 = new DeliveryRoute { Name = "R-102: Corredor Industrial Delta", DayOfWeek = "Jueves", BranchId = branch.Id, DriverId = d2.Id };
            _context.Routes.Add(r2);
        }
        else { r2.DriverId = d2.Id; }

        var r3 = await _context.Routes.FirstOrDefaultAsync(r => r.Name.Contains("R-103"));
        if (r3 == null)
        {
            r3 = new DeliveryRoute { Name = "R-103: Zona Norte Campestre", DayOfWeek = "Jueves", BranchId = branch.Id, DriverId = d3.Id };
            _context.Routes.Add(r3);
        }
        else { r3.DriverId = d3.Id; }

        await _context.SaveChangesAsync();

        // 4. Paradas secuenciales de clientes para cada ruta
        var route1Stops = new[]
        {
            ("Abarrotes La Principal Centro", 21.1235, -101.6840, true, 4850m, 120m),
            ("Super San Juan de Dios", 21.1210, -101.6795, true, 3200m, 80m),
            ("Mini Super El Arco Triunfal", 21.1180, -101.6750, true, 6100m, 150m),
            ("Comercializadora Madero", 21.1165, -101.6720, true, 2900m, 70m),
            ("Tienda Don Pepe Belisario", 21.1140, -101.6690, false, 0m, 0m),
            ("Abarrotes La Calzada", 21.1120, -101.6660, false, 0m, 0m),
            ("Depósito San Pedro", 21.1100, -101.6630, false, 0m, 0m)
        };

        var route2Stops = new[]
        {
            ("Distribuidora Industrial Delta", 21.0920, -101.6320, true, 8900m, 240m),
            ("Abarrotes San Miguel Sur", 21.0950, -101.6350, true, 4200m, 110m),
            ("Super Carnicería Omega", 21.0990, -101.6400, true, 5500m, 130m),
            ("Mini Super Blvd. Aeropuerto", 21.1030, -101.6450, false, 0m, 0m),
            ("Abarrotes El Retiro Industrial", 21.1070, -101.6500, false, 0m, 0m),
            ("Tienda Las Torres", 21.1110, -101.6550, false, 0m, 0m)
        };

        var route3Stops = new[]
        {
            ("Super Gourmet Campestre", 21.1580, -101.7050, true, 11500m, 290m),
            ("Mini Super Paseo del Moral", 21.1540, -101.7010, true, 7300m, 180m),
            ("Abarrotes Panorama", 21.1500, -101.6960, true, 4800m, 120m),
            ("Comercial San Jerónimo", 21.1460, -101.6910, true, 5600m, 140m),
            ("Depósito Hidalgo Norte", 21.1420, -101.6870, true, 3900m, 95m),
            ("Tienda Valle del Campestre", 21.1380, -101.6830, false, 0m, 0m),
            ("Mini Super Blvd. Insurgentes", 21.1340, -101.6790, false, 0m, 0m),
            ("Abarrotes Jardines del Moral", 21.1300, -101.6750, false, 0m, 0m)
        };

        // Procesar clientes
        async Task ProcessRouteClients(int routeId, (string name, double lat, double lng, bool visited, decimal amount, decimal weight)[] stops)
        {
            foreach (var stop in stops)
            {
                var client = await _context.Clients.FirstOrDefaultAsync(c => c.Name == stop.name);
                if (client == null)
                {
                    client = new Client
                    {
                        Name = stop.name,
                        Zone = "León",
                        RouteId = routeId,
                        Latitude = stop.lat,
                        Longitude = stop.lng,
                        IsVisited = stop.visited,
                        CreditLimit = 25000m,
                        CurrentBalance = 0m,
                        CreditDays = 30
                    };
                    _context.Clients.Add(client);
                }
                else
                {
                    client.RouteId = routeId;
                    client.Latitude = stop.lat;
                    client.Longitude = stop.lng;
                    client.IsVisited = stop.visited;
                }
            }
        }

        await ProcessRouteClients(r1.Id, route1Stops);
        await ProcessRouteClients(r2.Id, route2Stops);
        await ProcessRouteClients(r3.Id, route3Stops);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Demostración de 3 rutas activas en León, Gto generada exitosamente.", r1Id = r1.Id, r2Id = r2.Id, r3Id = r3.Id });
    }
}
