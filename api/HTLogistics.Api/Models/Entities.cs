using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTLogistics.Api.Models;

public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Role { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    
    public int? ClientId { get; set; }
    public Client? Client { get; set; }

    public int? SucursalId { get; set; }
    public Branch? Sucursal { get; set; }
}

public class Branch
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Zone { get; set; }
    public required string Manager { get; set; }
    
    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<Driver> Drivers { get; set; } = new List<Driver>();
}

public class Warehouse
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Type { get; set; } // Principal, Sucursal
    public required string Manager { get; set; }
    public bool IsActive { get; set; }
    
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Driver
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Status { get; set; } 
    public string? Phone { get; set; }
    
    public double CurrentFuelEfficiency { get; set; }
    public int TotalStopsToday { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    
    public bool HasIncident { get; set; }
    public string? IncidentReason { get; set; }
    
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    public int? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public decimal CommissionPercentage { get; set; }
}

public class Vehicle
{
    public int Id { get; set; }
    public required string PlateNumber { get; set; }
    public required string Model { get; set; }
    public required string Brand { get; set; }
    public required string Status { get; set; } // Disponible, Mantenimiento, En Ruta
}

public class DeliveryRoute
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string DayOfWeek { get; set; }
    
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    
    public int DriverId { get; set; }
    public Driver? Driver { get; set; }
    
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    
    public string? OptimizedPathJSON { get; set; }
}

public class Client
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Zone { get; set; }
    public bool IsVisited { get; set; }
    public double Latitude { get; set; } 
    public double Longitude { get; set; } 
    
    public int RouteId { get; set; }
    public DeliveryRoute? Route { get; set; }

    public decimal CreditLimit { get; set; }
    public decimal CurrentBalance { get; set; }
    public bool HasOverdueDebt { get; set; }

    // Datos Fiscales (Para Facturación)
    public string? RFC { get; set; }
    public string? RazonSocial { get; set; }
    public string? RegimenFiscal { get; set; }
    public string? CodigoPostal { get; set; }
}

public class Product
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    
    public int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    
    public int? CategoryId { get; set; }
    public ProductCategory? Category { get; set; }
    
    public string? UnitOfMeasure { get; set; }
    public string? SKU { get; set; }
    
    public decimal BoxPrice { get; set; }
    public int UnitsPerBox { get; set; }
    public decimal VolumePrice { get; set; }

    public decimal Cost { get; set; }
    public decimal IvaRate { get; set; } // e.g., 0.16
    public decimal IepsRate { get; set; } // e.g., 0.08

    public bool IsPromotion { get; set; }
    public decimal? PromotionPrice { get; set; }

    public string? SatProductKey { get; set; } // e.g. 50202306 for Coca Cola
    public string? SatUnitKey { get; set; } // e.g. H87 for Piece

    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductBatch> Batches { get; set; } = new List<ProductBatch>();
}

public class ProductCategory
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Icon { get; set; } // e.g. "🥛", "🧴"
    
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class ProductBatch
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    
    public required string BatchNumber { get; set; }
    public DateTime ExpirationDate { get; set; }
    public int Quantity { get; set; }
    public DateTime EntryDate { get; set; }
}

public class InventoryMovement
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    
    public int Quantity { get; set; }
    public required string Type { get; set; } // Entrada, Salida, Ajuste
    public required string Reason { get; set; } // Venta, Compra, Merma, Devolución
    public DateTime Date { get; set; }
    public int UserId { get; set; }
    public string? Reference { get; set; } // Numero de pedido u OC
}

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public required string PhotoBase64 { get; set; }
}

public class Order
{
    public int Id { get; set; }
    public required string OrderNumber { get; set; } 
    public required string Status { get; set; } 
    public string? Time { get; set; }
    public string? PhotoBase64 { get; set; }
    public string? DeliveryPhotoBase64 { get; set; }
    
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    
    public int RouteId { get; set; }
    public DeliveryRoute? Route { get; set; }
    
    public int DriverId { get; set; }
    public Driver? Driver { get; set; }
    
    public string PaymentMethod { get; set; } = "Contado";
    public bool NeedsAdminApproval { get; set; }
    public string? AdminApprovalReason { get; set; }
    public bool IsApprovedByAdmin { get; set; }
    public decimal CommissionAmount { get; set; }
    
    public decimal TotalAmount { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalCost { get; set; } // Para reporte de margen
    
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsGeoValidated { get; set; } // Validated against client coordinates
    
    // Facturación
    public bool IsFacturado { get; set; }
    public string? FolioFiscal { get; set; } // UUID
    public DateTime? FechaFacturacion { get; set; }
    
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class OrderReturn
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    
    public int Quantity { get; set; }
    public required string Reason { get; set; }
    public required string Status { get; set; } // Pendiente, Reingresado, Merma
}

public class PurchaseOrder
{
    public int Id { get; set; }
    public required string PoNumber { get; set; } 
    public int ProviderId { get; set; }
    public Provider? Provider { get; set; }
    public required string Status { get; set; } 
    
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    
    public int Quantity { get; set; }
    public decimal Cost { get; set; }
    
    public string? BatchNumber { get; set; }
    public DateTime? ExpirationDate { get; set; }
}

public class LoginInputModel
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public int SucursalId { get; set; }
}

public class WarehouseInputModel
{
    public required string Nombre { get; set; }
    public int SucursalId { get; set; }
    public required string Tipo { get; set; }
    public required string Responsable { get; set; }
}

public class DriverInputModel
{
    public required string Nombre { get; set; }
    public string? Telefono { get; set; }
    public int? VehiculoId { get; set; }
    public int SucursalId { get; set; }
    public decimal Comision { get; set; }
}

public class RouteInputModel
{
    public required string Nombre { get; set; }
    public required string Dia { get; set; }
    public int SucursalId { get; set; }
    public int VendedorId { get; set; }
    public required string ClientesText { get; set; }
}

public class PurchaseOrderInputModel
{
    public int ProviderId { get; set; }
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public decimal Costo { get; set; }
    public string? Lote { get; set; }
    public DateTime? Caducidad { get; set; }
}

public class Provider
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Contact { get; set; }
    public required string Phone { get; set; }
}

public class ClientPrice
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public decimal SpecialPrice { get; set; }
}

public class CreditNote
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public int? OrderId { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public required string Reason { get; set; }
}

public class ClientPayment
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? Reference { get; set; }
    public string? PaymentMethod { get; set; } // Efectivo, Transferencia, Cheque
}

public class Visit
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public int DriverId { get; set; }
    public Driver? Driver { get; set; }
    public DateTime Date { get; set; }
    public bool SaleAccomplished { get; set; }
    public string? NoSaleReason { get; set; } // Stock, Precio, Cerrado, etc.
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string Action { get; set; } = string.Empty; // Create, Update, Delete
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; }
}

public class ExpenseCategory
{
    public int Id { get; set; }
    public required string Name { get; set; }
}

public class Expense
{
    public int Id { get; set; }
    public int? ProviderId { get; set; }
    public Provider? Provider { get; set; }
    public int ExpenseCategoryId { get; set; }
    public ExpenseCategory? Category { get; set; }
    public required string Concept { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? ReferenceNumber { get; set; }
    public bool IsPaid { get; set; }
}

public class CashClosure
{
    public int Id { get; set; }
    public int DriverId { get; set; }
    public Driver? Driver { get; set; }
    public int RouteId { get; set; }
    public DeliveryRoute? Route { get; set; }
    public DateTime Date { get; set; }
    public decimal TotalExpected { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalDeclared { get; set; } // Declared by driver (Blind)
    public decimal TotalExpenses { get; set; }
    public decimal Difference { get; set; }
    
    public required string Status { get; set; } // Abierto, Cerrado
    public string? Observations { get; set; }
}

public class BranchInputModel
{
    public required string Name { get; set; }
    public required string Zone { get; set; }
    public required string Manager { get; set; }
}


public class DeliveryInputModel
{
    public int OrderId { get; set; }
    public string? PhotoBase64 { get; set; }
}

public class IncidentInputModel
{
    public int DriverId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class OrderInputModel
{
    public int ClientId { get; set; }
    public int RouteId { get; set; }
    public int DriverId { get; set; }
    public string? PhotoBase64 { get; set; }
    public string PaymentMethod { get; set; } = "Contado";
    public List<OrderItemInput> Items { get; set; } = new();
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class OrderItemInput
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class VehicleInputModel
{
    public required string Placas { get; set; }
    public required string Modelo { get; set; }
    public required string Marca { get; set; }
}

public class CashClosureInputModel
{
    public int DriverId { get; set; }
    public int RouteId { get; set; }
    public decimal TotalExpected { get; set; }
    public decimal TotalReceived { get; set; }
    public string? Observations { get; set; }
}

public class ProductInputModel
{
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public int WarehouseId { get; set; }
    public string? SKU { get; set; }
    public List<string>? Photos { get; set; }
    public decimal BoxPrice { get; set; }
    public int UnitsPerBox { get; set; }
    public decimal VolumePrice { get; set; }
}

public class ProviderInputModel
{
    public required string Name { get; set; }
    public required string Contact { get; set; }
    public required string Phone { get; set; }
}

public class ClientInputModel
{
    public required string Name { get; set; }
    public required string Zone { get; set; }
    public int RouteId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class OrderReturnBatchInput
{
    public int OrderId { get; set; }
    public List<OrderReturnInputModel> Returns { get; set; } = new();
}

public class OrderReturnInputModel
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public required string Reason { get; set; }
}

public class ReturnAuthorizeInputModel
{
    public bool IsWaste { get; set; }
}

public class ExpenseCategoryInputModel
{
    public required string Name { get; set; }
}

public class ExpenseInputModel
{
    public int? ProviderId { get; set; }
    public int ExpenseCategoryId { get; set; }
    public required string Concept { get; set; }
    public decimal Amount { get; set; }
    public string? ReferenceNumber { get; set; }
    public bool IsPaid { get; set; }
}

public class VisitInputModel
{
    public int ClientId { get; set; }
    public int DriverId { get; set; }
    public bool SaleAccomplished { get; set; }
    public string? NoSaleReason { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class PaymentInputModel
{
    public int ClientId { get; set; }
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string? PaymentMethod { get; set; }
}

public class CashClosureDeclareInput
{
    public int ClosureId { get; set; }
    public decimal TotalDeclared { get; set; }
    public string? Observations { get; set; }
}

public class ProductBulkUpdateModel
{
    public int Id { get; set; }
    public decimal? Price { get; set; }
    public int? Stock { get; set; }
    public decimal? Cost { get; set; }
}

public class UserInputModel
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Password { get; set; }
    public required string Role { get; set; }
    public int? SucursalId { get; set; }
    public int? ClientId { get; set; }
}