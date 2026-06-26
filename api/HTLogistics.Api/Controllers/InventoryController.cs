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
        var total = await _context.Products.CountAsync();
        
        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        var pendingOrders = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.Status == "Pendiente" || o.Status == "Esperando Autorización Admin")
            .ToListAsync();
            
        var pendingQtyByProduct = pendingOrders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));
            
        foreach (var p in products)
        {
            if (pendingQtyByProduct.ContainsKey(p.Id))
            {
                p.Stock -= pendingQtyByProduct[p.Id];
                if (p.Stock < 0) p.Stock = 0; // Evitar stock negativo visual
            }
        }
            
        return Ok(new { data = products, total, page, pageSize });
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
                WarehouseLocationId = input.WarehouseLocationId,
                SKU = input.SKU,
                BoxPrice = input.BoxPrice,
                UnitsPerBox = input.UnitsPerBox,
                VolumePrice = input.VolumePrice
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
            prod.WarehouseLocationId = input.WarehouseLocationId;
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

}
