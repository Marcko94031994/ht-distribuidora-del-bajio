using Microsoft.EntityFrameworkCore;
using HTLogistics.Api.Models;

namespace HTLogistics.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
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
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<CashClosure> CashClosures => Set<CashClosure>();
    public DbSet<ProductBatch> ProductBatches => Set<ProductBatch>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Branch>()
            .HasMany(b => b.Warehouses)
            .WithOne(w => w.Branch)
            .HasForeignKey(w => w.BranchId);

        modelBuilder.Entity<Branch>()
            .HasMany(b => b.Drivers)
            .WithOne(d => d.Branch)
            .HasForeignKey(d => d.BranchId);

        modelBuilder.Entity<DeliveryRoute>()
            .HasMany(r => r.Clients)
            .WithOne(c => c.Route)
            .HasForeignKey(c => c.RouteId);

        modelBuilder.Entity<DeliveryRoute>()
            .HasMany(r => r.Orders)
            .WithOne(o => o.Route)
            .HasForeignKey(o => o.RouteId);

        modelBuilder.Entity<Order>()
            .HasMany(o => o.Items)
            .WithOne(i => i.Order)
            .HasForeignKey(i => i.OrderId);

        modelBuilder.Entity<Warehouse>()
            .HasMany(w => w.Products)
            .WithOne(p => p.Warehouse)
            .HasForeignKey(p => p.WarehouseId);
            
        modelBuilder.Entity<Driver>()
            .Property(d => d.CurrentFuelEfficiency)
            .HasPrecision(5, 2);
    }
}
