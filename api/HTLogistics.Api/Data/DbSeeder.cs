using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HTLogistics.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync()) return; // Already seeded

        // 1. Users
        var adminUser = new User { Name = "Marco Antonio", Role = "Admin", Email = "demo@abarrotera.mx", Password = BCrypt.Net.BCrypt.HashPassword("123456") };
        context.Users.Add(adminUser);

        // 2. Branches
        var branches = new List<Branch>
        {
            new Branch { Name = "Sucursal León Centro", Zone = "Centro León", Manager = "Gerencia Centro" },
            new Branch { Name = "Sucursal León Norte", Zone = "San Juan Bosco", Manager = "Gerencia Norte" },
            new Branch { Name = "Sucursal Silao", Zone = "Silao Gto.", Manager = "Gerencia Silao" }
        };
        context.Branches.AddRange(branches);
        await context.SaveChangesAsync();

        // 3. Warehouses
        var warehouses = new List<Warehouse>
        {
            new Warehouse { Name = "Almacén Principal León", BranchId = branches[0].Id, Type = "Principal", Manager = "Miguel Ríos", IsActive = true },
            new Warehouse { Name = "Almacén Norte", BranchId = branches[1].Id, Type = "Sucursal", Manager = "Ana Lara", IsActive = true },
            new Warehouse { Name = "Almacén Silao", BranchId = branches[2].Id, Type = "Sucursal", Manager = "Pedro Luna", IsActive = true }
        };
        context.Warehouses.AddRange(warehouses);
        await context.SaveChangesAsync();

        // 4. Vehicles
        var vehicles = new List<Vehicle>
        {
            new Vehicle { PlateNumber = "GT-100-A", Model = "NP300", Brand = "Nissan", Status = "Disponible" },
            new Vehicle { PlateNumber = "GT-200-B", Model = "Hilux", Brand = "Toyota", Status = "Disponible" },
            new Vehicle { PlateNumber = "GT-300-C", Model = "F-150", Brand = "Ford", Status = "En Ruta" }
        };
        context.Vehicles.AddRange(vehicles);
        await context.SaveChangesAsync();

        // 5. Drivers
        var drivers = new List<Driver>
        {
            new Driver { Name = "Luis Mendoza", Status = "Activo", Phone = "4771234567", VehicleId = vehicles[0].Id, CommissionPercentage = 2.5m, BranchId = branches[0].Id },
            new Driver { Name = "Carlos Ruíz", Status = "Activo", Phone = "4777654321", VehicleId = vehicles[1].Id, CommissionPercentage = 3.0m, BranchId = branches[0].Id },
            new Driver { Name = "Pedro Gómez", Status = "Activo", Phone = "4779876543", VehicleId = vehicles[2].Id, CommissionPercentage = 2.0m, BranchId = branches[1].Id }
        };
        context.Drivers.AddRange(drivers);
        await context.SaveChangesAsync();

        // 5. Routes
        var routes = new List<DeliveryRoute>
        {
            new DeliveryRoute { Name = "Ruta Centro", DayOfWeek = "Lunes", BranchId = branches[0].Id, DriverId = drivers[0].Id },
            new DeliveryRoute { Name = "Ruta Norte", DayOfWeek = "Lunes", BranchId = branches[1].Id, DriverId = drivers[1].Id },
            new DeliveryRoute { Name = "Ruta Silao", DayOfWeek = "Martes", BranchId = branches[2].Id, DriverId = drivers[2].Id }
        };
        context.Routes.AddRange(routes);
        await context.SaveChangesAsync();

        // 6. Clients
        var clients = new List<Client>
        {
            new Client { Name = "Abarrotes Lupita", Zone = "Centro", IsVisited = false, RouteId = routes[0].Id, Latitude = 21.11, Longitude = -101.68, CreditLimit = 5000, CurrentBalance = 0, HasOverdueDebt = false },
            new Client { Name = "Mini Súper Gema", Zone = "Las Trojes", IsVisited = true, RouteId = routes[0].Id, Latitude = 21.13, Longitude = -101.66, CreditLimit = 2000, CurrentBalance = 1500, HasOverdueDebt = true },
            new Client { Name = "Tienda La Esquina", Zone = "Plaza Mayor", IsVisited = false, RouteId = routes[0].Id, Latitude = 21.15, Longitude = -101.64, CreditLimit = 10000, CurrentBalance = 0, HasOverdueDebt = false },
            new Client { Name = "Depósito Ramírez", Zone = "Hilamas", IsVisited = false, RouteId = routes[1].Id, Latitude = 21.14, Longitude = -101.61, CreditLimit = 3000, CurrentBalance = 0, HasOverdueDebt = false },
            new Client { Name = "Abarrotes Diana", Zone = "San Miguel", IsVisited = false, RouteId = routes[1].Id, Latitude = 21.12, Longitude = -101.63, CreditLimit = 1500, CurrentBalance = 0, HasOverdueDebt = false },
            new Client { Name = "Miscelánea Rosy", Zone = "Centro Silao", IsVisited = false, RouteId = routes[2].Id, Latitude = 20.94, Longitude = -101.42, CreditLimit = 1000, CurrentBalance = 0, HasOverdueDebt = false },
            new Client { Name = "Abarrotes Del Valle", Zone = "Valle", IsVisited = false, RouteId = routes[2].Id, Latitude = 20.95, Longitude = -101.43, CreditLimit = 2000, CurrentBalance = 0, HasOverdueDebt = false }
        };
        context.Clients.AddRange(clients);
        await context.SaveChangesAsync();

        // Path JSONs logic for frontend (approximating Demo's X,Y)
        routes[0].OptimizedPathJSON = "[{\"lat\": 21.11, \"lng\": -101.68}, {\"lat\": 21.13, \"lng\": -101.66}, {\"lat\": 21.15, \"lng\": -101.64}]";
        routes[1].OptimizedPathJSON = "[{\"lat\": 21.14, \"lng\": -101.61}, {\"lat\": 21.12, \"lng\": -101.63}]";
        routes[2].OptimizedPathJSON = "[{\"lat\": 20.94, \"lng\": -101.42}, {\"lat\": 20.95, \"lng\": -101.43}]";
        
        // 7. Categories (Pasillos)
        var categories = new List<ProductCategory>
        {
            new ProductCategory { Name = "Refrescos", Icon = "🥤" },
            new ProductCategory { Name = "Botanas", Icon = "🥨" },
            new ProductCategory { Name = "Galletería", Icon = "🍪" },
            new ProductCategory { Name = "Abarrotes", Icon = "🌾" },
            new ProductCategory { Name = "Limpieza", Icon = "🧼" }
        };
        context.ProductCategories.AddRange(categories);
        await context.SaveChangesAsync();

        // 7.1 Products
        var products = new List<Product>
        {
            new Product { Name = "Coca 600 ml", Price = 18m, Stock = 45, WarehouseId = warehouses[0].Id, SKU = "P-001", BoxPrice = 160m, UnitsPerBox = 12, VolumePrice = 17m, Cost = 12.5m, IvaRate = 0.16m, IepsRate = 0.08m, CategoryId = categories[0].Id, IsPromotion = true, PromotionPrice = 15.5m },
            new Product { Name = "Sabritas 45 g", Price = 17m, Stock = 32, WarehouseId = warehouses[0].Id, SKU = "P-002", BoxPrice = 150m, UnitsPerBox = 10, VolumePrice = 16m, Cost = 11.2m, IvaRate = 0m, IepsRate = 0.08m, CategoryId = categories[1].Id },
            new Product { Name = "Galletas Marías", Price = 24m, Stock = 20, WarehouseId = warehouses[1].Id, SKU = "P-003", BoxPrice = 220m, UnitsPerBox = 10, VolumePrice = 23m, Cost = 18.0m, IvaRate = 0m, IepsRate = 0.08m, CategoryId = categories[2].Id, IsPromotion = true, PromotionPrice = 19.9m },
            new Product { Name = "Arroz 1 kg", Price = 29m, Stock = 18, WarehouseId = warehouses[1].Id, SKU = "P-004", BoxPrice = 550m, UnitsPerBox = 20, VolumePrice = 28m, Cost = 22.5m, IvaRate = 0m, IepsRate = 0m, CategoryId = categories[3].Id },
            new Product { Name = "Frijol 1 kg", Price = 32m, Stock = 16, WarehouseId = warehouses[2].Id, SKU = "P-005", BoxPrice = 600m, UnitsPerBox = 20, VolumePrice = 31m, Cost = 25.0m, IvaRate = 0m, IepsRate = 0m, CategoryId = categories[3].Id }
        };
        context.Products.AddRange(products);
        await context.SaveChangesAsync();

        // 7.2 Providers
        var providers = new List<Provider>
        {
            new Provider { Name = "Proveedor Bajío", Contact = "Juan Pérez", Phone = "477 123 4567" },
            new Provider { Name = "Dulces y Botanas León", Contact = "María García", Phone = "477 987 6543" }
        };
        context.Providers.AddRange(providers);
        await context.SaveChangesAsync();

        // 7.2 Client Prices
        var clientPrices = new List<ClientPrice>
        {
            new ClientPrice { ClientId = clients[0].Id, ProductId = products[0].Id, SpecialPrice = 16.50m }, // Abarrotes Lupita, Coca 600ml
            new ClientPrice { ClientId = clients[1].Id, ProductId = products[1].Id, SpecialPrice = 15.00m } // Mini Súper Gema, Sabritas
        };
        context.ClientPrices.AddRange(clientPrices);
        await context.SaveChangesAsync();

        // 8. Orders
        var orders = new List<Order>
        {
            new Order { OrderNumber = "P-1001", ClientId = clients[1].Id, RouteId = routes[0].Id, DriverId = drivers[0].Id, Status = "Pendiente", Time = "08:42" },
            new Order { OrderNumber = "P-1002", ClientId = clients[3].Id, RouteId = routes[1].Id, DriverId = drivers[1].Id, Status = "En remisión", Time = "09:10" }
        };
        context.Orders.AddRange(orders);
        await context.SaveChangesAsync();

        // Order Items
        context.OrderItems.AddRange(new List<OrderItem>
        {
            new OrderItem { OrderId = orders[0].Id, ProductId = products[0].Id, Quantity = 6 },
            new OrderItem { OrderId = orders[0].Id, ProductId = products[1].Id, Quantity = 4 },
            new OrderItem { OrderId = orders[1].Id, ProductId = products[2].Id, Quantity = 5 }
        });
        
        // 9. Purchase Orders
        context.PurchaseOrders.AddRange(new List<PurchaseOrder>
        {
            new PurchaseOrder { PoNumber = "OC-2001", ProviderId = providers[0].Id, ProductId = products[0].Id, Quantity = 20, Cost = 12m, Status = "Borrador" },
            new PurchaseOrder { PoNumber = "OC-2002", ProviderId = providers[1].Id, ProductId = products[1].Id, Quantity = 15, Cost = 10m, Status = "Autorizada" }
        });

        await context.SaveChangesAsync();

        // 9.1 Initial Batches
        context.ProductBatches.AddRange(new List<ProductBatch>
        {
            new ProductBatch { ProductId = products[0].Id, BatchNumber = "LOT-001", ExpirationDate = DateTime.Now.AddMonths(6), Quantity = 25, EntryDate = DateTime.Now },
            new ProductBatch { ProductId = products[0].Id, BatchNumber = "LOT-002", ExpirationDate = DateTime.Now.AddMonths(12), Quantity = 20, EntryDate = DateTime.Now },
            new ProductBatch { ProductId = products[1].Id, BatchNumber = "LOT-003", ExpirationDate = DateTime.Now.AddMonths(3), Quantity = 32, EntryDate = DateTime.Now }
        });
        await context.SaveChangesAsync();

        // 10. Expense Categories
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

        // Link admin to a client for B2B testing
        var admin = await context.Users.FirstOrDefaultAsync(u => u.Email == "demo@abarrotera.mx");
        var client = await context.Clients.FirstOrDefaultAsync(c => c.Name == "Abarrotes Lupita");
        if (admin != null && client != null)
        {
            admin.ClientId = client.Id;
            await context.SaveChangesAsync();
        }
    }
}
