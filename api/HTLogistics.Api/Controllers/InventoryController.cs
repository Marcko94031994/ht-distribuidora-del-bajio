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
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public InventoryController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var total = await _context.Products.AsNoTracking().CountAsync();
        
        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        return Ok(new { data = products, total, page, pageSize });
    }

    [HttpPost("product")]
        public async Task<IActionResult> CreateProduct([FromBody] ProductInputModel input)
        {
            var prod = new Product 
            { 
                Name = input.Name, 
                Price = input.Price, 
                Price1 = input.Price1,
                Price2 = input.Price2,
                Price3 = input.Price3,
                Price4 = input.Price4,
                Price5 = input.Price5,
                Cost = input.Cost,
                Cogs = input.Cogs,
                Weight = input.Weight,
                IsPerishable = input.IsPerishable,
                MinStock = input.MinStock,
                MaxStock = input.MaxStock,
                SKU = input.SKU,
                AlternativeCode = input.AlternativeCode,
                CategoryId = input.CategoryId,
                BrandId = input.BrandId,
                DefaultProviderId = input.DefaultProviderId,
                BoxPrice = input.BoxPrice,
                UnitsPerBox = input.UnitsPerBox,
                VolumePrice = input.VolumePrice,
                UnitOfMeasure = input.UnitOfMeasure,
                BoxUnitOfMeasure = input.BoxUnitOfMeasure,
                Currency = input.Currency,
                IsBlocked = input.IsBlocked,
                Status = input.Status
            };
            _context.Products.Add(prod);
            await _context.SaveChangesAsync();

            if (input.Photos != null)
            {
                foreach (var p in input.Photos)
                {
                    _context.ProductImages.Add(new ProductImage { ProductId = prod.Id, PhotoBase64 = p });
                }
                await _context.SaveChangesAsync();
            }

            if (input.Stock > 0 && input.WarehouseId.HasValue)
            {
                var inventory = new ProductInventory 
                { 
                    ProductId = prod.Id, 
                    WarehouseId = input.WarehouseId.Value, 
                    WarehouseLocationId = input.WarehouseLocationId,
                    Stock = input.Stock.Value,
                    CommittedStock = 0
                };
                _context.ProductInventories.Add(inventory);

                var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userIdString)) {
                    var userId = int.Parse(userIdString);
                    _context.InventoryMovements.Add(new InventoryMovement {
                        ProductId = prod.Id,
                        WarehouseId = input.WarehouseId.Value,
                        Quantity = input.Stock.Value,
                        Type = "Entrada",
                        Reason = "Ajuste Inicial",
                        Date = DateTime.Now,
                        UserId = userId,
                        Reference = "Creación de Producto"
                    });
                }
                await _context.SaveChangesAsync();
            }

            return Ok(prod);
        }

    [HttpPut("product/{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductInputModel input)
        {
            var prod = await _context.Products.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
            if (prod == null) return NotFound();
    
            prod.Name = input.Name;
            prod.Price = input.Price;
            prod.Price1 = input.Price1;
            prod.Price2 = input.Price2;
            prod.Price3 = input.Price3;
            prod.Price4 = input.Price4;
            prod.Price5 = input.Price5;
            prod.Cost = input.Cost;
            prod.Cogs = input.Cogs;
            prod.Weight = input.Weight;
            prod.IsPerishable = input.IsPerishable;
            prod.MinStock = input.MinStock;
            prod.MaxStock = input.MaxStock;
            prod.SKU = input.SKU;
            prod.AlternativeCode = input.AlternativeCode;
            prod.CategoryId = input.CategoryId;
            prod.BrandId = input.BrandId;
            prod.DefaultProviderId = input.DefaultProviderId;
            prod.BoxPrice = input.BoxPrice;
            prod.UnitsPerBox = input.UnitsPerBox;
            prod.VolumePrice = input.VolumePrice;
            prod.UnitOfMeasure = input.UnitOfMeasure;
            prod.BoxUnitOfMeasure = input.BoxUnitOfMeasure;
            prod.Currency = input.Currency;
            prod.IsBlocked = input.IsBlocked;
            prod.Status = input.Status;
    
            if (input.Photos != null && input.Photos.Any())
            {
                _context.ProductImages.RemoveRange(prod.Images);
                foreach (var photo in input.Photos)
                {
                    prod.Images.Add(new ProductImage { PhotoBase64 = photo });
                }
            }
    
            await _context.SaveChangesAsync();

            if (input.Stock.HasValue && input.WarehouseId.HasValue)
            {
                var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == prod.Id && i.WarehouseId == input.WarehouseId.Value);
                if (inventory == null)
                {
                    inventory = new ProductInventory { ProductId = prod.Id, WarehouseId = input.WarehouseId.Value, WarehouseLocationId = input.WarehouseLocationId, Stock = 0, CommittedStock = 0 };
                    _context.ProductInventories.Add(inventory);
                }

                if (inventory.Stock != input.Stock.Value)
                {
                    var diff = input.Stock.Value - inventory.Stock;
                    inventory.Stock = input.Stock.Value;
                    
                    var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    if (!string.IsNullOrEmpty(userIdString)) {
                        var userId = int.Parse(userIdString);
                        _context.InventoryMovements.Add(new InventoryMovement {
                            ProductId = prod.Id,
                            WarehouseId = input.WarehouseId.Value,
                            Quantity = Math.Abs(diff),
                            Type = diff > 0 ? "Entrada" : "Salida",
                            Reason = "Ajuste Manual",
                            Date = DateTime.Now,
                            UserId = userId,
                            Reference = "Actualización de Catálogo"
                        });
                    }
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(prod);
        }

    [HttpPost("purchase-order")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] PurchaseOrderInputModel input)
    {
        var po = new PurchaseOrder 
        { 
            PoNumber = "OC-" + new Random().Next(1000, 9999), 
            ProviderId = input.ProviderId, 
            Reference1 = input.Reference1,
            Reference2 = input.Reference2,
            Notes = input.Notes,
            Status = "Borrador",
            Date = DateTime.Now,
            DueDate = DateTime.Now.AddDays(30) // Default 30 days for CxP
        };
        
        decimal subtotal = 0;
        decimal taxAmount = 0;
        if(input.Detalles != null)
        {
            foreach(var det in input.Detalles)
            {
                var lineSubtotal = det.Cantidad * det.Costo;
                var ivaRate = det.IvaPercent > 0 ? (det.IvaPercent / 100m) : 0m;
                var lineTax = Math.Round(lineSubtotal * ivaRate, 2);
                var lineTotal = lineSubtotal + lineTax;

                po.Details.Add(new PurchaseOrderDetail 
                {
                    ProductId = det.ProductoId,
                    Quantity = det.Cantidad,
                    OrderedQuantity = det.Cantidad,
                    ReceivedQuantity = det.Cantidad,
                    UnitCost = det.Costo,
                    OrderedUnitCost = det.Costo,
                    ReceivedUnitCost = det.Costo,
                    IvaRate = ivaRate,
                    Subtotal = lineSubtotal,
                    TaxAmount = lineTax,
                    Total = lineTotal,
                    WarehouseId = det.WarehouseId,
                    Location = det.Location,
                    BatchNumber = det.Lote,
                    ExpirationDate = det.Caducidad,
                    IsAdditional = false
                });
                subtotal += lineSubtotal;
                taxAmount += lineTax;
            }
        }
        po.Subtotal = subtotal;
        po.TaxAmount = taxAmount;
        po.TotalAmount = subtotal + taxAmount;
        po.OriginalTotalAmount = po.TotalAmount; // Trazabilidad inicial

        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPut("purchase-order/{id}")]
    public async Task<IActionResult> UpdatePurchaseOrder(int id, [FromBody] PurchaseOrderInputModel input)
    {
        var po = await _context.PurchaseOrders.Include(p => p.Details).FirstOrDefaultAsync(p => p.Id == id);
        if (po == null) return NotFound();

        if (po.Status != "Borrador" && po.Status != "Pendiente")
        {
            return BadRequest("Solo se pueden editar órdenes en estado Borrador/Pendiente que no hayan sido recibidas en inventario.");
        }

        po.ProviderId = input.ProviderId;
        po.Reference1 = input.Reference1;
        po.Reference2 = input.Reference2;
        po.Notes = input.Notes;

        // Remove old details
        _context.PurchaseOrderDetails.RemoveRange(po.Details);
        po.Details.Clear();

        decimal subtotal = 0;
        decimal taxAmount = 0;
        if (input.Detalles != null)
        {
            foreach (var det in input.Detalles)
            {
                var lineSubtotal = det.Cantidad * det.Costo;
                var ivaRate = det.IvaPercent > 0 ? (det.IvaPercent / 100m) : 0m;
                var lineTax = Math.Round(lineSubtotal * ivaRate, 2);
                var lineTotal = lineSubtotal + lineTax;

                po.Details.Add(new PurchaseOrderDetail
                {
                    PurchaseOrderId = po.Id,
                    ProductId = det.ProductoId,
                    Quantity = det.Cantidad,
                    OrderedQuantity = det.Cantidad,
                    ReceivedQuantity = det.Cantidad,
                    UnitCost = det.Costo,
                    OrderedUnitCost = det.Costo,
                    ReceivedUnitCost = det.Costo,
                    IvaRate = ivaRate,
                    Subtotal = lineSubtotal,
                    TaxAmount = lineTax,
                    Total = lineTotal,
                    WarehouseId = det.WarehouseId,
                    Location = det.Location,
                    BatchNumber = det.Lote,
                    ExpirationDate = det.Caducidad,
                    IsAdditional = false
                });
                subtotal += lineSubtotal;
                taxAmount += lineTax;
            }
        }
        po.Subtotal = subtotal;
        po.TaxAmount = taxAmount;
        po.TotalAmount = subtotal + taxAmount;
        po.OriginalTotalAmount = po.TotalAmount;

        await _context.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPost("purchase-order/{id}/cancel")]
    public async Task<IActionResult> CancelPurchaseOrder(int id)
    {
        var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id);
        if (po == null) return NotFound();

        if (po.Status != "Borrador" && po.Status != "Pendiente")
        {
            return BadRequest("Solo se pueden cancelar órdenes en estado Borrador que no hayan sido recibidas en inventario.");
        }

        po.Status = "Cancelada";
        await _context.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPost("purchase-order/{id}/receive")]
    public async Task<IActionResult> ReceivePurchaseOrder(int id, [FromBody] ReceivePurchaseOrderInputModel input)
    {
        var po = await _context.PurchaseOrders.Include(p => p.Details).FirstOrDefaultAsync(p => p.Id == id);
        if (po == null) return NotFound("Orden de compra no encontrada.");

        if (po.Status != "Borrador" && po.Status != "Pendiente")
        {
            return BadRequest("Solo se pueden recibir órdenes en estado Borrador o Pendiente que no hayan sido recibidas previamente.");
        }

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = string.IsNullOrEmpty(userIdString) ? 1 : int.Parse(userIdString);

        if (po.OriginalTotalAmount == 0)
        {
            po.OriginalTotalAmount = po.TotalAmount;
        }

        po.Status = "Recibida";
        po.ReceivedDate = DateTime.Now;
        po.AuthorizedDate = DateTime.Now;
        po.ReceivedById = userId;
        po.AuthorizedById = userId;
        po.ReceptionNotes = input.ReceptionNotes;
        if (!string.IsNullOrWhiteSpace(input.Reference1)) po.Reference1 = input.Reference1;
        if (!string.IsNullOrWhiteSpace(input.Reference2)) po.Reference2 = input.Reference2;

        // Limpiar detalles anteriores para registrar los recibidos con trazabilidad
        _context.PurchaseOrderDetails.RemoveRange(po.Details);
        po.Details.Clear();

        decimal subtotal = 0;
        decimal taxAmount = 0;

        if (input.Items != null && input.Items.Count > 0)
        {
            foreach (var item in input.Items)
            {
                Product? product = null;
                if (item.ProductId.HasValue && item.ProductId.Value > 0)
                {
                    product = await _context.Products.FindAsync(item.ProductId.Value);
                }

                // Si no se encuentra por Id o viene nuevo SKU, buscar por SKU o autocrear
                if (product == null && !string.IsNullOrWhiteSpace(item.Sku))
                {
                    var skuClean = item.Sku.Trim();
                    product = await _context.Products.FirstOrDefaultAsync(p => p.SKU != null && p.SKU.ToLower() == skuClean.ToLower());

                    if (product == null)
                    {
                        // Autocrear en catálogo sin categoría para clasificación manual posterior
                        product = new Product
                        {
                            SKU = skuClean,
                            Name = !string.IsNullOrWhiteSpace(item.ProductName) ? item.ProductName.Trim() : $"Producto {skuClean}",
                            CategoryId = null, // Sin Categoría (clasificación manual posterior)
                            Cost = item.ReceivedUnitCost > 0 ? item.ReceivedUnitCost : (item.OrderedUnitCost > 0 ? item.OrderedUnitCost : 0),
                            Price = item.ReceivedUnitCost > 0 ? Math.Round(item.ReceivedUnitCost * 1.25m, 2) : 0,
                            Status = "Activo"
                        };
                        _context.Products.Add(product);
                        await _context.SaveChangesAsync(); // Genera product.Id
                    }
                }

                if (product == null) continue;

                var recQty = item.ReceivedQuantity;
                var recCost = item.ReceivedUnitCost > 0 ? item.ReceivedUnitCost : item.OrderedUnitCost;
                var ordQty = item.OrderedQuantity > 0 ? item.OrderedQuantity : (item.IsAdditional ? 0 : recQty);
                var ordCost = item.OrderedUnitCost > 0 ? item.OrderedUnitCost : recCost;

                var lineSubtotal = recQty * recCost;
                var ivaRate = item.IvaPercent > 0 ? (item.IvaPercent / 100m) : 0m;
                var lineTax = Math.Round(lineSubtotal * ivaRate, 2);
                var lineTotal = lineSubtotal + lineTax;

                var targetWarehouseId = item.WarehouseId ?? 1;

                var detail = new PurchaseOrderDetail
                {
                    PurchaseOrderId = po.Id,
                    ProductId = product.Id,
                    Quantity = ordQty,
                    OrderedQuantity = ordQty,
                    ReceivedQuantity = recQty,
                    UnitCost = ordCost,
                    OrderedUnitCost = ordCost,
                    ReceivedUnitCost = recCost,
                    IvaRate = ivaRate,
                    Subtotal = lineSubtotal,
                    TaxAmount = lineTax,
                    Total = lineTotal,
                    WarehouseId = targetWarehouseId,
                    Location = item.Location,
                    BatchNumber = item.BatchNumber,
                    ExpirationDate = item.ExpirationDate,
                    VarianceReason = item.VarianceReason,
                    IsAdditional = item.IsAdditional
                };

                po.Details.Add(detail);
                subtotal += lineSubtotal;
                taxAmount += lineTax;

                // Si se recibieron piezas físicas (> 0), aplicar entradas de inventario
                if (recQty > 0)
                {
                    product.Cost = recCost; // Actualizar último costo

                    // 1. Inventario por almacén
                    var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == targetWarehouseId);
                    if (inventory == null)
                    {
                        inventory = new ProductInventory 
                        { 
                            ProductId = product.Id, 
                            WarehouseId = targetWarehouseId, 
                            Stock = 0, 
                            CommittedStock = 0 
                        };
                        _context.ProductInventories.Add(inventory);
                    }
                    inventory.Stock += recQty;

                    // 3. Crear lote físico
                    _context.ProductBatches.Add(new ProductBatch
                    {
                        ProductId = product.Id,
                        WarehouseId = targetWarehouseId,
                        BatchNumber = !string.IsNullOrWhiteSpace(item.BatchNumber) ? item.BatchNumber : ("LOTE-" + DateTime.Now.ToString("yyyyMMdd")),
                        ExpirationDate = item.ExpirationDate ?? DateTime.Now.AddMonths(12),
                        Quantity = recQty,
                        EntryDate = DateTime.Now
                    });

                    // 4. Movimiento en Kardex / Trazabilidad
                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        ProductId = product.Id,
                        WarehouseId = targetWarehouseId,
                        Quantity = recQty,
                        Type = "Entrada",
                        Reason = "Recepción OC",
                        Date = DateTime.Now,
                        UserId = userId,
                        Reference = $"{po.PoNumber} (Fact: {po.Reference1 ?? "S/F"})"
                    });
                }
            }
        }

        po.Subtotal = subtotal;
        po.TaxAmount = taxAmount;
        po.TotalAmount = subtotal + taxAmount;

        // Actualizar saldo de cuenta por pagar (CxP) del proveedor con el monto real recibido
        var provider = await _context.Providers.FindAsync(po.ProviderId);
        if (provider != null)
        {
            provider.CurrentBalance += po.TotalAmount;
        }

        await _context.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPost("purchase-order/{id}/apply")]
    public async Task<IActionResult> ApplyPurchaseOrder(int id)
    {
        // Compatibilidad: Redirige o aplica la orden directa si se llama al endpoint legado
        var po = await _context.PurchaseOrders.Include(p => p.Details).FirstOrDefaultAsync(p => p.Id == id);
        if (po == null) return NotFound();

        var receiveInput = new ReceivePurchaseOrderInputModel
        {
            ReceptionNotes = "Recepción rápida automática",
            Reference1 = po.Reference1,
            Reference2 = po.Reference2,
            Items = po.Details.Select(d => new ReceivePurchaseOrderDetailModel
            {
                DetailId = d.Id,
                ProductId = d.ProductId,
                OrderedQuantity = d.Quantity > 0 ? d.Quantity : d.OrderedQuantity,
                ReceivedQuantity = d.Quantity > 0 ? d.Quantity : d.OrderedQuantity,
                OrderedUnitCost = d.UnitCost > 0 ? d.UnitCost : d.OrderedUnitCost,
                ReceivedUnitCost = d.UnitCost > 0 ? d.UnitCost : d.OrderedUnitCost,
                IvaPercent = d.IvaRate * 100m,
                WarehouseId = d.WarehouseId,
                Location = d.Location,
                BatchNumber = d.BatchNumber,
                ExpirationDate = d.ExpirationDate,
                IsAdditional = false
            }).ToList()
        };

        return await ReceivePurchaseOrder(id, receiveInput);
    }

    [HttpPut("products/bulk")]
        [Authorize(Roles = "Admin,Almacenista")]
        public async Task<IActionResult> UpdateBulkProducts([FromBody] List<ProductBulkUpdateModel> updates)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userId = string.IsNullOrEmpty(userIdString) ? 1 : int.Parse(userIdString);

            foreach (var up in updates)
            {
                Product? p = null;
                if (up.Id.HasValue && up.Id.Value > 0)
                {
                    p = await _context.Products.FindAsync(up.Id.Value);
                }
                else if (!string.IsNullOrWhiteSpace(up.Sku))
                {
                    var cleanSku = up.Sku.Trim();
                    p = await _context.Products.FirstOrDefaultAsync(x => x.SKU != null && x.SKU.ToLower() == cleanSku.ToLower());
                }

                if (p != null)
                {
                    if (up.Price.HasValue) p.Price = up.Price.Value;
                    if (up.Price1.HasValue) p.Price1 = up.Price1.Value;
                    if (up.Price2.HasValue) p.Price2 = up.Price2.Value;
                    if (up.Price3.HasValue) p.Price3 = up.Price3.Value;
                    if (up.Price4.HasValue) p.Price4 = up.Price4.Value;
                    if (up.Price5.HasValue) p.Price5 = up.Price5.Value;
                    if (up.BoxPrice.HasValue) p.BoxPrice = up.BoxPrice.Value;
                    if (up.VolumePrice.HasValue) p.VolumePrice = up.VolumePrice.Value;
                    if (up.Cost.HasValue) p.Cost = up.Cost.Value;
                    if (up.Cogs.HasValue) p.Cogs = up.Cogs.Value;

                    // Bulk stock updates disabled in multi-warehouse. Use adjustments endpoint.
                }
            }
            await _context.SaveChangesAsync();
            return Ok();
        }

    [HttpGet("product/{id}/kardex")]
        [Authorize(Roles = "Admin,Almacenista,Supervisor")]
        public async Task<IActionResult> GetProductKardex(int id)
        {
            var movements = await _context.InventoryMovements
                .Where(m => m.ProductId == id)
                .OrderByDescending(m => m.Date)
                .ToListAsync();
            
            return Ok(movements);
        }

    [HttpPost("inventory/adjustment")]
        [Authorize(Roles = "Admin,Almacenista")]
        public async Task<IActionResult> RegisterAdjustment([FromBody] InventoryAdjustmentInput input)
        {
            if (input.Quantity <= 0) return BadRequest("La cantidad debe ser mayor a cero.");

            var product = await _context.Products.FindAsync(input.ProductId);
            if (product == null) return NotFound("Producto no encontrado.");

            var inventory = await _context.ProductInventories.FirstOrDefaultAsync(i => i.ProductId == input.ProductId && i.WarehouseId == 1 /* Default */);
            if (inventory == null || inventory.Stock < input.Quantity)
                return BadRequest($"Stock físico insuficiente.");

            inventory.Stock -= input.Quantity;

            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userId = string.IsNullOrEmpty(userIdString) ? 1 : int.Parse(userIdString);

            var movement = new InventoryMovement
            {
                ProductId = product.Id,
                Quantity = input.Quantity,
                Type = "Salida",
                Reason = $"{input.AdjustmentType}: {input.Reason}",
                Date = DateTime.Now,
                UserId = userId,
                Reference = $"Ajuste-{DateTime.Now.Ticks}"
            };

            _context.InventoryMovements.Add(movement);
            await _context.SaveChangesAsync();

            return Ok(product);
        }

}
