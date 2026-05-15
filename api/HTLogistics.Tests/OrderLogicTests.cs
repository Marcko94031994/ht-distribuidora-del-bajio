using HTLogistics.Api.Controllers;
using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using Xunit;
using System;

namespace HTLogistics.Tests;

public class OrderLogicTests
{
    private AppDbContext GetDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task AuthorizeOrder_ShouldDecreaseStockAndChangeStatus()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var context = GetDbContext(dbName);
        
        var product = new Product { Name = "Test Prod", Price = 10, Stock = 50, BoxPrice = 100, UnitsPerBox = 10, VolumePrice = 9 };
        context.Products.Add(product);
        await context.SaveChangesAsync();

        var client = new Client { Name = "Test", Zone = "Z", Latitude = 0, Longitude = 0 };
        context.Clients.Add(client);
        var driver = new Driver { Name = "Test Driver", Status = "Libre", BranchId = 1 };
        context.Drivers.Add(driver);
        await context.SaveChangesAsync();

        var order = new Order 
        {
            OrderNumber = "O-1001",
            Status = "Pendiente",
            ClientId = client.Id,
            RouteId = 1,
            DriverId = driver.Id
        };
        context.Orders.Add(order);
        await context.SaveChangesAsync();

        context.OrderItems.Add(new OrderItem { OrderId = order.Id, ProductId = product.Id, Quantity = 20 });
        await context.SaveChangesAsync();

        var controller = new AppController(context);

        // Act
        var result = await controller.AuthorizeOrder(order.Id);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        
        var updatedOrder = await context.Orders.FindAsync(order.Id);
        Assert.Equal("En remisión", updatedOrder!.Status);

        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(30, updatedProduct!.Stock); // 50 - 20
    }

    [Fact]
    public async Task ApplyPurchaseOrder_ShouldIncreaseStock()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var context = GetDbContext(dbName);

        var product = new Product { Name = "Test Prod", Price = 10, Stock = 10, BoxPrice = 100, UnitsPerBox = 10, VolumePrice = 9 };
        context.Products.Add(product);
        await context.SaveChangesAsync();

        var po = new PurchaseOrder
        {
            PoNumber = "PO-001",
            ProductId = product.Id,
            ProviderId = 1,
            Quantity = 100,
            Cost = 5,
            Status = "Borrador"
        };
        context.PurchaseOrders.Add(po);
        await context.SaveChangesAsync();

        var controller = new AppController(context);

        // Act
        var result = await controller.ApplyPurchaseOrder(po.Id);

        // Assert
        Assert.IsType<OkObjectResult>(result);

        var updatedPo = await context.PurchaseOrders.FindAsync(po.Id);
        Assert.Equal("Compra definitiva", updatedPo!.Status);

        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(110, updatedProduct!.Stock); // 10 + 100
    }

    [Fact]
    public async Task CompleteDelivery_ShouldSavePhotoAndMarkClientVisited()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var context = GetDbContext(dbName);

        var client = new Client { Name = "Test Client", Zone = "Zone 1", IsVisited = false };
        context.Clients.Add(client);
        var driver = new Driver { Name = "D1", Status = "L", BranchId = 1 };
        context.Drivers.Add(driver);
        await context.SaveChangesAsync();

        var order = new Order 
        {
            OrderNumber = "O-1002",
            Status = "En remisión",
            ClientId = client.Id,
            RouteId = 1,
            DriverId = driver.Id
        };
        context.Orders.Add(order);
        await context.SaveChangesAsync();

        var controller = new AppController(context);
        var photoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        var input = new DeliveryInputModel { OrderId = order.Id, PhotoBase64 = photoBase64 };

        // Act
        var result = await controller.CompleteDelivery(input);

        // Assert
        Assert.IsType<OkObjectResult>(result);

        var updatedOrder = await context.Orders.FindAsync(order.Id);
        Assert.Equal("Entregado", updatedOrder!.Status);
        Assert.StartsWith("/uploads/", updatedOrder.DeliveryPhotoBase64);

        var updatedClient = await context.Clients.FindAsync(client.Id);
        Assert.True(updatedClient!.IsVisited);
    }
}
