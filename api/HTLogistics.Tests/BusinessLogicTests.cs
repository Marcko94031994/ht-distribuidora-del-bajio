using HTLogistics.Api.Controllers;
using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HTLogistics.Tests;

public class BusinessLogicTests
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
    public async Task FEFO_ShouldConsumeOldestBatchFirst()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var context = GetDbContext(dbName);
        var controller = new AppController(context);

        var product = new Product { Name = "Milk", Price = 20, Cost = 15, Stock = 100 };
        context.Products.Add(product);

        var client = new Client { Name = "Test Client", Zone = "X", Latitude = 0, Longitude = 0 };
        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var order = new Order { OrderNumber = "P-1", Status = "Pendiente", ClientId = client.Id };
        context.Orders.Add(order);
        await context.SaveChangesAsync();
        
        var item = new OrderItem { OrderId = order.Id, ProductId = product.Id, Quantity = 15, UnitPrice = 20 };
        order.Items.Add(item);
        product.Batches.Add(new ProductBatch { 
            ProductId = product.Id, BatchNumber = "B-OLD", 
            ExpirationDate = DateTime.Now.AddDays(1), Quantity = 10 
        });
        product.Batches.Add(new ProductBatch { 
            ProductId = product.Id, BatchNumber = "B-NEW", 
            ExpirationDate = DateTime.Now.AddYears(1), Quantity = 50 
        });
        await context.SaveChangesAsync();

        // Act
        await controller.AuthorizeOrder(order.Id);

        // Assert
        var batchOld = await context.ProductBatches.FirstAsync(b => b.BatchNumber == "B-OLD");
        var batchNew = await context.ProductBatches.FirstAsync(b => b.BatchNumber == "B-NEW");

        Assert.Equal(0, batchOld.Quantity); // Completely consumed
        Assert.Equal(45, batchNew.Quantity); // 50 - (15 - 10) = 45
    }

    [Fact]
    public async Task CreateOrder_ShouldCalculateProfitCorrectly()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var context = GetDbContext(dbName);
        var controller = new AppController(context);

        var product = new Product { 
            Name = "Soda", Price = 20, Cost = 10, Stock = 100, 
            IvaRate = 0.16m, IepsRate = 0.08m 
        };
        context.Products.Add(product);
        
        var client = new Client { Name = "Store X", Zone = "North", Latitude = 21.0, Longitude = -101.0 };
        context.Clients.Add(client);
        
        await context.SaveChangesAsync();

        var input = new OrderInputModel {
            ClientId = client.Id,
            RouteId = 1,
            DriverId = 1,
            Latitude = 21.0,
            Longitude = -101.0,
            Items = new List<OrderItemInput> { new OrderItemInput { ProductId = product.Id, Quantity = 2 } }
        };

        // Act
        var result = await controller.CreateOrder(input);
        var okResult = result as OkObjectResult;
        var order = okResult?.Value as Order;

        // Assert
        Assert.NotNull(order);
        // Price = 20. Tax = 20 * (0.16 + 0.08) = 20 * 0.24 = 4.8. Total per unit = 24.8.
        // For 2 units: Total = 49.6. Tax = 9.6. Cost = 20.
        Assert.Equal(49.6m, order.TotalAmount);
        Assert.Equal(9.6m, order.TotalTax);
        Assert.Equal(20m, order.TotalCost);
        Assert.True(order.IsGeoValidated);
    }
}
