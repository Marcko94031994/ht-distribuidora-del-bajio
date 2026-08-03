using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using HTLogistics.Api.Services.Interfaces;

namespace HTLogistics.Api.Services
{
    public class OrderService : IOrderService
    {
        private readonly AppDbContext _context;

        public OrderService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Order?> GetOrderByIdAsync(int id)
        {
            return await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Client)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<Order?> AuthorizeOrderAsync(int id, int userId)
        {
            var order = await GetOrderByIdAsync(id);
            if (order == null) return null;

            if (order.Status != "Pendiente" && order.Status != "Esperando Autorización Admin")
                throw new ArgumentException("Order is not in a state that can be authorized");

            if (order.Status == "Esperando Autorización Admin" && !order.IsApprovedByAdmin)
                throw new ArgumentException("Order requires Admin authorization first.");

            order.Status = "En remisión";

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var item in order.Items)
                {
                    var product = await _context.Products
                        .Include(p => p.Batches)
                        .FirstOrDefaultAsync(p => p.Id == item.ProductId);

                    if (product != null)
                    {
                        // Get primary warehouse of the branch, or default to 1
                        var route = await _context.Routes.FindAsync(order.RouteId);
                        var warehouse = await _context.Warehouses
                            .FirstOrDefaultAsync(w => w.BranchId == route.BranchId && w.Type == "Principal") 
                            ?? await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId)
                            ?? await _context.Warehouses.FirstAsync();

                        var inventory = await _context.ProductInventories
                            .FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == warehouse.Id);

                        if (inventory == null) 
                        {
                            inventory = new ProductInventory { ProductId = product.Id, WarehouseId = warehouse.Id, Stock = 0, CommittedStock = 0 };
                            _context.ProductInventories.Add(inventory);
                        }

                        int remainingToDeduct = item.Quantity;
                        
                        var batches = product.Batches
                            .Where(b => b.WarehouseId == warehouse.Id && b.Quantity > 0)
                            .OrderBy(b => b.ExpirationDate)
                            .ToList();

                        foreach (var batch in batches)
                        {
                            if (remainingToDeduct <= 0) break;
                            int deductFromThisBatch = Math.Min(batch.Quantity, remainingToDeduct);
                            batch.Quantity -= deductFromThisBatch;
                            remainingToDeduct -= deductFromThisBatch;
                        }

                        inventory.Stock -= item.Quantity;
                        if (inventory.Stock < 0) inventory.Stock = 0;
                        
                        inventory.CommittedStock -= item.Quantity;
                        if (inventory.CommittedStock < 0) inventory.CommittedStock = 0;

                        _context.InventoryMovements.Add(new InventoryMovement
                        {
                            ProductId = product.Id,
                            WarehouseId = warehouse.Id,
                            Quantity = -item.Quantity,
                            Type = "Salida",
                            Reason = "Venta",
                            Date = DateTime.Now,
                            UserId = userId,
                            Reference = order.OrderNumber
                        });
                    }
                }

                if (order.PaymentMethod == "Crédito" && order.Client != null)
                {
                    order.Client.CurrentBalance += order.TotalAmount;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return order;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<Order?> UpdateOrderStatusAsync(int id, string status, int userId)
        {
            var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
            if (order == null) return null;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (status == "Cancelado" && order.Status != "Cancelado")
                {
                    foreach (var item in order.Items)
                    {
                        var product = await _context.Products.FindAsync(item.ProductId);
                        if (product != null)
                        {
                            var route = await _context.Routes.FindAsync(order.RouteId);
                            var warehouse = await _context.Warehouses
                                .FirstOrDefaultAsync(w => w.BranchId == route.BranchId && w.Type == "Principal") 
                                ?? await _context.Warehouses.FirstOrDefaultAsync(w => w.BranchId == route.BranchId)
                                ?? await _context.Warehouses.FirstAsync();

                            var inventory = await _context.ProductInventories
                                .FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == warehouse.Id);

                            if (inventory == null) 
                            {
                                inventory = new ProductInventory { ProductId = product.Id, WarehouseId = warehouse.Id, Stock = 0, CommittedStock = 0 };
                                _context.ProductInventories.Add(inventory);
                            }

                            if (order.Status == "Pendiente" || order.Status == "Esperando Autorización Admin")
                            {
                                inventory.CommittedStock -= item.Quantity;
                                if (inventory.CommittedStock < 0) inventory.CommittedStock = 0;
                            }
                            else if (order.Status == "En remisión")
                            {
                                inventory.Stock += item.Quantity;
                                _context.InventoryMovements.Add(new InventoryMovement
                                {
                                    ProductId = product.Id,
                                    WarehouseId = warehouse.Id,
                                    Quantity = item.Quantity,
                                    Type = "Entrada",
                                    Reason = "Devolución por Cancelación",
                                    Date = DateTime.Now,
                                    UserId = userId,
                                    Reference = order.OrderNumber
                                });
                            }
                        }
                    }
                }

                order.Status = status;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return order;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
