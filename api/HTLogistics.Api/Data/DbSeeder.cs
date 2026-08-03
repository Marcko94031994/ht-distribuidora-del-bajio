using System.Text.Json;
using HTLogistics.Api.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace HTLogistics.Api.Data;

public static class DbSeeder
{
    private class SeedData
    {
        public List<SeedProveedor> Proveedores { get; set; } = new();
        public List<SeedAlmacen> Almacenes { get; set; } = new();
        public List<SeedMarca> Marcas { get; set; } = new();
        public List<SeedProducto> Productos { get; set; } = new();
        public List<SeedCliente> Clientes { get; set; } = new();
        public List<SeedRuta> Rutas { get; set; } = new();
        public List<SeedVendedor> Vendedores_Choferes { get; set; } = new();
        public List<SeedVehiculo> Vehículos { get; set; } = new();
    }

    private class SeedMarca { public string Nombre_Marca { get; set; } = ""; }
    private class SeedProveedor { public string Nombre_Proveedor { get; set; } = ""; public string Contacto { get; set; } = ""; public string Telefono { get; set; } = ""; public string RFC { get; set; } = ""; }
    private class SeedAlmacen { public string Nombre_Almacen { get; set; } = ""; public string Tipo { get; set; } = ""; public string Responsable { get; set; } = ""; public string Sucursal_Perteneciente { get; set; } = ""; }
    private class SeedProducto { public string Nombre { get; set; } = ""; public string SKU { get; set; } = ""; public string AlternativeCode { get; set; } = ""; public string Categoria { get; set; } = ""; public string Marca { get; set; } = ""; public decimal? Precio_Unitario { get; set; } public decimal? Price1 { get; set; } public decimal? Price2 { get; set; } public decimal? Price3 { get; set; } public decimal? Price4 { get; set; } public decimal? Price5 { get; set; } public decimal? Costo { get; set; } public decimal? Cogs { get; set; } public decimal? Peso_KG { get; set; } public string Unidad { get; set; } = ""; public string BoxUnitOfMeasure { get; set; } = ""; public int? Unidades_Caja { get; set; } public decimal? Precio_Caja { get; set; } public decimal? Precio_Volumen { get; set; } public string Clave_SAT { get; set; } = ""; public string SatUnitKey { get; set; } = ""; public string Currency { get; set; } = ""; public bool IsBlocked { get; set; } public string Status { get; set; } = ""; public string ProveedorDefault { get; set; } = ""; public int? Inventario_Inicial { get; set; } public string Nombre_Almacen { get; set; } = ""; }
    private class SeedCliente { public string Nombre_Comercial { get; set; } public string Zona_Ciudad { get; set; } public decimal? Limite_Credito { get; set; } public int? Dias_Credito { get; set; } public string RFC { get; set; } public string Razon_Social { get; set; } public string Codigo_Postal { get; set; } public string Regimen_Fiscal { get; set; } public string Nombre_Ruta_Asignada { get; set; } public string FormaPago { get; set; } public string MetodoPago { get; set; } public string UsoCFDI { get; set; } public string Telefonos { get; set; } public string Celular { get; set; } public string Email1 { get; set; } public string Email2 { get; set; } public string Email3 { get; set; } public string Colonia { get; set; } public string Localidad { get; set; } public string Municipio { get; set; } public string Referencia { get; set; } public bool Bloqueado { get; set; } }
    private class SeedRuta { public string Nombre_Ruta { get; set; } public string Dia_Asignado { get; set; } public string Sucursal { get; set; } public string Vendedor_Encargado { get; set; } }
    private class SeedVendedor { public string Nombre { get; set; } public string Telefono { get; set; } public decimal? Porcentaje_Comision { get; set; } public string Sucursal { get; set; } }
    private class SeedVehiculo { public string Placas { get; set; } public string Marca { get; set; } public string Modelo { get; set; } public string Estatus { get; set; } }

    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync()) return; // Already seeded

        var dataPath = Path.Combine(AppContext.BaseDirectory, "Data", "seed_data.json");
        if (!File.Exists(dataPath))
        {
            Console.WriteLine($"Seed file not found at {dataPath}");
            return;
        }

        var json = await File.ReadAllTextAsync(dataPath);
        var options = new JsonSerializerOptions 
        { 
            PropertyNameCaseInsensitive = true,
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
        };
        var seedData = JsonSerializer.Deserialize<SeedData>(json, options);        
        if (seedData == null) return;

        // 1. Admin User
        var adminUser = new User { Name = "Marco Antonio", Role = "Admin", Email = "demo@abarrotera.mx", Password = BCrypt.Net.BCrypt.HashPassword("123456") };
        context.Users.Add(adminUser);

        // Extract unique Branches from Almacenes
        var branchNames = seedData.Almacenes.Where(a => !string.IsNullOrEmpty(a.Sucursal_Perteneciente)).Select(a => a.Sucursal_Perteneciente).Distinct().ToList();
        var branches = branchNames.Select(name => new Branch { Name = "Sucursal " + name, Zone = name, Manager = "Gerencia " + name }).ToList();
        context.Branches.AddRange(branches);
        await context.SaveChangesAsync();

        // 2. Proveedores
        var providers = seedData.Proveedores
            .Where(p => !string.IsNullOrEmpty(p.Nombre_Proveedor))
            .Select(p => new Provider { Name = p.Nombre_Proveedor, Contact = p.Contacto, Phone = p.Telefono, RFC = p.RFC })
            .ToList();
        context.Providers.AddRange(providers);
        await context.SaveChangesAsync();

        // 3. Almacenes
        var warehouses = new List<Warehouse>();
        foreach (var sa in seedData.Almacenes.Where(a => !string.IsNullOrEmpty(a.Nombre_Almacen)))
        {
            var bId = branches.FirstOrDefault(b => b.Zone == sa.Sucursal_Perteneciente)?.Id ?? branches.First().Id;
            warehouses.Add(new Warehouse { Name = sa.Nombre_Almacen, Type = sa.Tipo ?? "Principal", Manager = sa.Responsable ?? "", BranchId = bId, IsActive = true });
        }
        context.Warehouses.AddRange(warehouses);
        await context.SaveChangesAsync();

        // 4. Vehículos
        var vehicles = seedData.Vehículos
            .Where(v => !string.IsNullOrEmpty(v.Placas))
            .Select(v => new Vehicle { PlateNumber = v.Placas, Brand = v.Marca, Model = v.Modelo, Status = v.Estatus ?? "Disponible" })
            .ToList();
        context.Vehicles.AddRange(vehicles);
        await context.SaveChangesAsync();

        // 5. Vendedores / Choferes (Create Users as well)
        var drivers = new List<Driver>();
        int vehicleIndex = 0;
        foreach (var sv in seedData.Vendedores_Choferes.Where(v => !string.IsNullOrEmpty(v.Nombre)))
        {
            var bId = branches.FirstOrDefault(b => b.Zone == sv.Sucursal)?.Id ?? branches.First().Id;
            int? vId = vehicleIndex < vehicles.Count ? vehicles[vehicleIndex++].Id : null;
            
            drivers.Add(new Driver { Name = sv.Nombre, Phone = sv.Telefono, CommissionPercentage = sv.Porcentaje_Comision ?? 0, Status = "Activo", BranchId = bId, VehicleId = vId });
            
            // Create user account for vendor
            var emailName = sv.Nombre.Split(' ')[0].ToLower();
            context.Users.Add(new User { Name = sv.Nombre, Role = "Chofer", Email = $"{emailName}@abarrotera.mx", Password = BCrypt.Net.BCrypt.HashPassword("123456") });
        }
        context.Drivers.AddRange(drivers);
        await context.SaveChangesAsync();

        // 6. Rutas
        var routes = new List<DeliveryRoute>();
        foreach (var sr in seedData.Rutas.Where(r => !string.IsNullOrEmpty(r.Nombre_Ruta)))
        {
            var bId = branches.FirstOrDefault(b => b.Zone == sr.Sucursal)?.Id ?? branches.First().Id;
            var dId = drivers.FirstOrDefault(d => d.Name == sr.Vendedor_Encargado)?.Id ?? drivers.First().Id;
            routes.Add(new DeliveryRoute { Name = sr.Nombre_Ruta, DayOfWeek = sr.Dia_Asignado ?? "Lunes", BranchId = bId, DriverId = dId });
        }
        context.Routes.AddRange(routes);
        await context.SaveChangesAsync();

        // 7. Clientes
        var clients = new List<Client>();
        foreach (var sc in seedData.Clientes.Where(c => !string.IsNullOrEmpty(c.Nombre_Comercial)))
        {
            var rId = routes.FirstOrDefault(r => r.Name == sc.Nombre_Ruta_Asignada)?.Id ?? routes.First().Id;
            
            // Simple random geocode inside León (for demo layout)
            var lat = 21.12 + (new Random().NextDouble() * 0.05);
            var lng = -101.68 + (new Random().NextDouble() * 0.05);
            
            clients.Add(new Client { 
                Name = sc.Nombre_Comercial, 
                Zone = sc.Zona_Ciudad, 
                RouteId = rId,
                Latitude = lat,
                Longitude = lng,
                CreditLimit = sc.Limite_Credito ?? 0,
                CreditDays = sc.Dias_Credito ?? 15,
                RFC = sc.RFC,
                RazonSocial = sc.Razon_Social,
                CodigoPostal = sc.Codigo_Postal,
                RegimenFiscal = sc.Regimen_Fiscal,
                CurrentBalance = 0,
                HasOverdueDebt = false,
                IsVisited = false,
                FormaPago = sc.FormaPago,
                MetodoPago = sc.MetodoPago,
                UsoCFDI = sc.UsoCFDI,
                Telefonos = sc.Telefonos,
                Celular = sc.Celular,
                Email1 = sc.Email1,
                Email2 = sc.Email2,
                Email3 = sc.Email3,
                Colonia = sc.Colonia,
                Localidad = sc.Localidad,
                Municipio = sc.Municipio,
                Referencia = sc.Referencia,
                IsBlocked = sc.Bloqueado
            });
        }
        context.Clients.AddRange(clients);
        await context.SaveChangesAsync();

        // Generate Categories dynamically from products
        var categoryNames = seedData.Productos.Where(p => !string.IsNullOrEmpty(p.Categoria)).Select(p => p.Categoria).Distinct().ToList();
        var categories = categoryNames.Select(c => new ProductCategory { Name = c, Icon = "📦" }).ToList();
        context.ProductCategories.AddRange(categories);
        await context.SaveChangesAsync();
        
        // Generate Brands dynamically
        var brandNames = seedData.Marcas.Where(m => !string.IsNullOrEmpty(m.Nombre_Marca)).Select(m => m.Nombre_Marca).Distinct().ToList();
        var brands = brandNames.Select(b => new ProductBrand { Name = b }).ToList();
        context.ProductBrands.AddRange(brands);
        await context.SaveChangesAsync();

        // 8. Productos
        var products = new List<Product>();
        var inventories = new List<ProductInventory>();
        
        foreach (var sp in seedData.Productos.Where(p => !string.IsNullOrEmpty(p.Nombre)))
        {
            var catId = categories.FirstOrDefault(c => c.Name == sp.Categoria)?.Id ?? categories.First().Id;
            var brandId = brands.FirstOrDefault(b => b.Name == sp.Marca)?.Id;
            
            var product = new Product {
                Name = sp.Nombre,
                SKU = sp.SKU ?? "SKU-" + Guid.NewGuid().ToString().Substring(0, 5),
                AlternativeCode = sp.AlternativeCode,
                Price = sp.Precio_Unitario ?? 0,
                Price1 = sp.Price1 ?? 0,
                Price2 = sp.Price2 ?? 0,
                Price3 = sp.Price3 ?? 0,
                Price4 = sp.Price4 ?? 0,
                Price5 = sp.Price5 ?? 0,
                Cost = sp.Costo ?? 0,
                Cogs = sp.Cogs ?? 0,
                BoxPrice = sp.Precio_Caja ?? (sp.Precio_Unitario * (sp.Unidades_Caja ?? 1) ?? 0),
                UnitsPerBox = sp.Unidades_Caja ?? 1,
                VolumePrice = sp.Precio_Volumen ?? sp.Precio_Unitario ?? 0,
                UnitOfMeasure = sp.Unidad,
                BoxUnitOfMeasure = sp.BoxUnitOfMeasure,
                Currency = sp.Currency,
                IsBlocked = sp.IsBlocked,
                Status = sp.Status,
                SatProductKey = sp.Clave_SAT,
                SatUnitKey = sp.SatUnitKey,
                CategoryId = catId,
                BrandId = brandId,
                IvaRate = 0, // Simplified for now
                IepsRate = 0, // Simplified
                IsPerishable = sp.Nombre.ToLower().Contains("leche") || sp.Nombre.ToLower().Contains("queso"), // Simple heuristic
            };
            context.Products.Add(product);
            await context.SaveChangesAsync(); // Save to get the generated ID
            
            if (sp.Inventario_Inicial > 0)
            {
                var wId = warehouses.FirstOrDefault(w => w.Name == sp.Nombre_Almacen)?.Id ?? warehouses.First().Id;
                inventories.Add(new ProductInventory {
                    ProductId = product.Id,
                    WarehouseId = wId,
                    Stock = sp.Inventario_Inicial ?? 0,
                    CommittedStock = 0
                });
            }
        }
        
        if (inventories.Any())
        {
            context.ProductInventories.AddRange(inventories);
            await context.SaveChangesAsync();
        }

        // 10. Expense Categories (Base configuration, independent of excel)
        if (!await context.ExpenseCategories.AnyAsync())
        {
            context.ExpenseCategories.AddRange(new List<ExpenseCategory>
            {
                new ExpenseCategory { Name = "Combustible" },
                new ExpenseCategory { Name = "Renta" },
                new ExpenseCategory { Name = "Mantenimiento" },
                new ExpenseCategory { Name = "Sueldos" },
                new ExpenseCategory { Name = "Servicios (Luz/Agua)" },
                new ExpenseCategory { Name = "Otros" }
            });
            await context.SaveChangesAsync();
        }
    }
}
