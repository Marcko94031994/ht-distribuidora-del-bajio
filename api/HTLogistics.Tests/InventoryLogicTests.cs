using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HTLogistics.Tests;

public class InventoryLogicTests
{
    private DbContextOptions<AppDbContext> _dbContextOptions;

    public InventoryLogicTests()
    {
        // Use an in-memory database for testing
        _dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task CompleteOrder_ShouldDeductFromEarliestExpirationBatches()
    {
        // Arrange
        using var context = new AppDbContext(_dbContextOptions);
        
        var product = new Product { Name = "Frijol", Price = 25, Stock = 30 };
        context.Products.Add(product);
        await context.SaveChangesAsync();
        
        // Batch A expires in 10 days
        var batchA = new ProductBatch { 
            ProductId = product.Id, 
            BatchNumber = "LOTE-A", 
            Quantity = 10, 
            ExpirationDate = DateTime.Now.AddDays(10),
            EntryDate = DateTime.Now
        };
        // Batch B expires in 20 days
        var batchB = new ProductBatch { 
            ProductId = product.Id, 
            BatchNumber = "LOTE-B", 
            Quantity = 20, 
            ExpirationDate = DateTime.Now.AddDays(20),
            EntryDate = DateTime.Now
        };
        
        context.ProductBatches.Add(batchA);
        context.ProductBatches.Add(batchB);
        await context.SaveChangesAsync();

        // Simulate Order requirement of 15 items
        int requiredQuantity = 15;
        
        // Act (FIFO Logic that will be implemented in OrdersController/Inventory Service)
        var batches = await context.ProductBatches
            .Where(b => b.ProductId == product.Id && b.Quantity > 0)
            .OrderBy(b => b.ExpirationDate) // PEPS
            .ToListAsync();
            
        int remainingToFulfill = requiredQuantity;
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
        
        product.Stock -= requiredQuantity;
        await context.SaveChangesAsync();

        // Assert
        var updatedBatchA = await context.ProductBatches.FindAsync(batchA.Id);
        var updatedBatchB = await context.ProductBatches.FindAsync(batchB.Id);
        var updatedProduct = await context.Products.FindAsync(product.Id);

        Assert.Equal(0, updatedBatchA!.Quantity); // Earliest batch fully depleted
        Assert.Equal(5, updatedBatchB!.Quantity);  // Second batch partially depleted (20 - 5 remaining = 15 fulfilled total)
        Assert.Equal(15, updatedProduct!.Stock);   // Total stock updated
    }

    [Fact]
    public async Task RegisterMerma_ShouldDeductFromSpecificBatch()
    {
        // Arrange
        using var context = new AppDbContext(_dbContextOptions);
        
        var product = new Product { Name = "Azucar", Price = 30, Stock = 50 };
        context.Products.Add(product);
        await context.SaveChangesAsync();
        
        var batch = new ProductBatch { 
            ProductId = product.Id, 
            BatchNumber = "LOTE-AZ", 
            Quantity = 50, 
            ExpirationDate = DateTime.Now.AddDays(30),
            EntryDate = DateTime.Now
        };
        context.ProductBatches.Add(batch);
        await context.SaveChangesAsync();
        
        int mermaQuantity = 5;
        string reason = "Bolsa Rota";
        
        // Act (Merma logic to be implemented)
        batch.Quantity -= mermaQuantity;
        product.Stock -= mermaQuantity;
        
        context.InventoryMovements.Add(new InventoryMovement {
            ProductId = product.Id,
            Quantity = mermaQuantity,
            Type = "Salida",
            Reason = $"Merma: {reason}",
            Date = DateTime.Now,
            UserId = 1, // Mock admin
            Reference = $"Lote: {batch.BatchNumber}"
        });
        
        await context.SaveChangesAsync();
        
        // Assert
        var updatedBatch = await context.ProductBatches.FindAsync(batch.Id);
        var movements = await context.InventoryMovements.ToListAsync();
        
        Assert.Equal(45, updatedBatch!.Quantity);
        Assert.Equal(45, product.Stock);
        Assert.Single(movements);
        Assert.Equal("Salida", movements.First().Type);
    }
}
