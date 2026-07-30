using Microsoft.EntityFrameworkCore;
using HTLogistics.Api.Models;

namespace HTLogistics.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<WarehouseLocation> WarehouseLocations => Set<WarehouseLocation>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<DeliveryRoute> Routes => Set<DeliveryRoute>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<Provider> Providers => Set<Provider>();
    public DbSet<ClientPrice> ClientPrices => Set<ClientPrice>();
    public DbSet<OrderReturn> OrderReturns => Set<OrderReturn>();
    public DbSet<CreditNote> CreditNotes => Set<CreditNote>();
    public DbSet<ClientPayment> ClientPayments => Set<ClientPayment>();
    public DbSet<ProviderPayment> ProviderPayments => Set<ProviderPayment>();
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<CashClosure> CashClosures => Set<CashClosure>();
    public DbSet<ProductBatch> ProductBatches => Set<ProductBatch>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DailyClosure> DailyClosures => Set<DailyClosure>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }
            
        // Set precision for all decimal properties to 18,2
        foreach (var property in modelBuilder.Model.GetEntityTypes()
            .SelectMany(t => t.GetProperties())
            .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(2);
        }

        modelBuilder.Entity<Driver>()
            .Property(d => d.CurrentFuelEfficiency)
            .HasPrecision(5, 2);
    }
}
