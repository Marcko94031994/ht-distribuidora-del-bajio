using System.Text;
using HTLogistics.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
// using OpenApiModels = Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Escuchar en todas las interfaces de red para permitir acceso externo
builder.WebHost.UseUrls("http://0.0.0.0:5200");

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();

/*
// Swagger Configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiModels.OpenApiInfo { Title = "HT Logística API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiModels.OpenApiSecurityScheme
    {
        In = OpenApiModels.ParameterLocation.Header,
        Description = "Please enter token",
        Name = "Authorization",
        Type = OpenApiModels.SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiModels.OpenApiSecurityRequirement
    {
        {
            new OpenApiModels.OpenApiSecurityScheme
            {
                Reference = new OpenApiModels.OpenApiReference
                {
                    Type = OpenApiModels.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
*/

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Dependency Injection
// (Services removed for new architecture)

// CORS
var allowedOrigins = builder.Configuration.GetSection("AllowedCorsOrigins").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
        else
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
});

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("Jwt");
        var key = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key is missing in configuration.");
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
/*
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
*/

app.UseCors();

// Servir el frontend directamente desde el API
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seeding Logic
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();
    await context.Database.EnsureCreatedAsync();
    
    async Task TrySql(string sql) {
        try { await context.Database.ExecuteSqlRawAsync(sql); } catch { }
    }

    // Auto-migration for Columns
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'CommittedStock') ALTER TABLE [Products] ADD [CommittedStock] int NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'BoxPrice') ALTER TABLE [Products] ADD [BoxPrice] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'UnitsPerBox') ALTER TABLE [Products] ADD [UnitsPerBox] int NOT NULL DEFAULT 1;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'VolumePrice') ALTER TABLE [Products] ADD [VolumePrice] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'IsPromotion') ALTER TABLE [Products] ADD [IsPromotion] bit NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'PromotionPrice') ALTER TABLE [Products] ADD [PromotionPrice] decimal(18,2) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'Cost') ALTER TABLE [Products] ADD [Cost] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'IvaRate') ALTER TABLE [Products] ADD [IvaRate] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'IepsRate') ALTER TABLE [Products] ADD [IepsRate] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'SatProductKey') ALTER TABLE [Products] ADD [SatProductKey] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'SatUnitKey') ALTER TABLE [Products] ADD [SatUnitKey] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'WarehouseLocationId') ALTER TABLE [Products] ADD [WarehouseLocationId] int NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'CategoryId') ALTER TABLE [Products] ADD [CategoryId] int NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'UnitOfMeasure') ALTER TABLE [Products] ADD [UnitOfMeasure] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'SKU') ALTER TABLE [Products] ADD [SKU] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'Weight') ALTER TABLE [Products] ADD [Weight] decimal(18,2) NOT NULL DEFAULT 0;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Providers]') AND name = 'CurrentBalance') ALTER TABLE [Providers] ADD [CurrentBalance] decimal(18,2) NOT NULL DEFAULT 0;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'CreditDays') ALTER TABLE [Clients] ADD [CreditDays] int NOT NULL DEFAULT 30;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'CreditLimit') ALTER TABLE [Clients] ADD [CreditLimit] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'CurrentBalance') ALTER TABLE [Clients] ADD [CurrentBalance] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'HasOverdueDebt') ALTER TABLE [Clients] ADD [HasOverdueDebt] bit NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'RFC') ALTER TABLE [Clients] ADD [RFC] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'RazonSocial') ALTER TABLE [Clients] ADD [RazonSocial] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'RegimenFiscal') ALTER TABLE [Clients] ADD [RegimenFiscal] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Clients]') AND name = 'CodigoPostal') ALTER TABLE [Clients] ADD [CodigoPostal] nvarchar(max) NULL;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Drivers]') AND name = 'Latitude') ALTER TABLE [Drivers] ADD [Latitude] float NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Drivers]') AND name = 'Longitude') ALTER TABLE [Drivers] ADD [Longitude] float NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Drivers]') AND name = 'HasIncident') ALTER TABLE [Drivers] ADD [HasIncident] bit NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Drivers]') AND name = 'IncidentReason') ALTER TABLE [Drivers] ADD [IncidentReason] nvarchar(max) NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Drivers]') AND name = 'VehicleId') ALTER TABLE [Drivers] ADD [VehicleId] int NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Drivers]') AND name = 'CommissionPercentage') ALTER TABLE [Drivers] ADD [CommissionPercentage] decimal(18,2) NOT NULL DEFAULT 0;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Routes]') AND name = 'OptimizedPathJSON') ALTER TABLE [Routes] ADD [OptimizedPathJSON] nvarchar(max) NULL;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[OrderItems]') AND name = 'IsBox') ALTER TABLE [OrderItems] ADD [IsBox] bit NOT NULL DEFAULT 0;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'AmountPaid') ALTER TABLE [Orders] ADD [AmountPaid] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'Date') ALTER TABLE [Orders] ADD [Date] datetime2 NOT NULL DEFAULT GETDATE();");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'DueDate') ALTER TABLE [Orders] ADD [DueDate] datetime2 NULL;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'TotalWeight') ALTER TABLE [Orders] ADD [TotalWeight] decimal(18,2) NOT NULL DEFAULT 0;");

    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PurchaseOrders]') AND name = 'AmountPaid') ALTER TABLE [PurchaseOrders] ADD [AmountPaid] decimal(18,2) NOT NULL DEFAULT 0;");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PurchaseOrders]') AND name = 'Date') ALTER TABLE [PurchaseOrders] ADD [Date] datetime2 NOT NULL DEFAULT GETDATE();");
    await TrySql("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PurchaseOrders]') AND name = 'DueDate') ALTER TABLE [PurchaseOrders] ADD [DueDate] datetime2 NULL;");

    // Auto-migration for Tables
    await TrySql(@"
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[WarehouseLocations]') AND type in (N'U'))
        CREATE TABLE [WarehouseLocations] (
            [Id] int NOT NULL IDENTITY,
            [WarehouseId] int NOT NULL,
            [Name] nvarchar(max) NOT NULL,
            [Description] nvarchar(max) NULL,
            CONSTRAINT [PK_WarehouseLocations] PRIMARY KEY ([Id])
        );
    ");

    await TrySql(@"
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ProviderPayments]') AND type in (N'U'))
        CREATE TABLE [ProviderPayments] (
            [Id] int NOT NULL IDENTITY,
            [ProviderId] int NOT NULL,
            [Amount] decimal(18,2) NOT NULL,
            [Date] datetime2 NOT NULL,
            [Reference] nvarchar(max) NULL,
            [PaymentMethod] nvarchar(max) NULL,
            CONSTRAINT [PK_ProviderPayments] PRIMARY KEY ([Id])
        );
    ");

    await TrySql(@"
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[InventoryMovements]') AND type in (N'U'))
        CREATE TABLE [InventoryMovements] (
            [Id] int NOT NULL IDENTITY,
            [ProductId] int NOT NULL,
            [Quantity] int NOT NULL,
            [Type] nvarchar(max) NOT NULL,
            [Reason] nvarchar(max) NOT NULL,
            [Date] datetime2 NOT NULL,
            [UserId] int NOT NULL,
            [Reference] nvarchar(max) NULL,
            CONSTRAINT [PK_InventoryMovements] PRIMARY KEY ([Id])
        );
    ");

    await TrySql(@"
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[DailyClosures]') AND type in (N'U'))
        CREATE TABLE [DailyClosures] (
            [Id] int NOT NULL IDENTITY,
            [Date] datetime2 NOT NULL,
            [TotalRouteCash] decimal(18,2) NOT NULL,
            [TotalBranchExpenses] decimal(18,2) NOT NULL,
            [ExpectedCashInSafe] decimal(18,2) NOT NULL,
            [DeclaredCashInSafe] decimal(18,2) NOT NULL,
            [Difference] decimal(18,2) NOT NULL,
            [UserId] int NOT NULL,
            [Observations] nvarchar(max) NULL,
            CONSTRAINT [PK_DailyClosures] PRIMARY KEY ([Id])
        );
    ");

    await DbSeeder.SeedAsync(context);
    
    // Hash existing plaintext passwords and force reset demo password
    var demoUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "demo@abarrotera.mx");
    if (demoUser != null) {
        demoUser.Password = BCrypt.Net.BCrypt.HashPassword("123456");
    }

    var usersToUpdate = await context.Users.Where(u => !u.Password!.StartsWith("$")).ToListAsync();
    foreach(var u in usersToUpdate) {
        u.Password = BCrypt.Net.BCrypt.HashPassword(u.Password);
    }
    await context.SaveChangesAsync();
}

app.Run();
