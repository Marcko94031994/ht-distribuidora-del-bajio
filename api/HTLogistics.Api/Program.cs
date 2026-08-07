using System.Text;
using HTLogistics.Api.Data;
using HTLogistics.Api.Services;
using HTLogistics.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using Serilog;
// using OpenApiModels = Microsoft.OpenApi.Models;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

// Escuchar en todas las interfaces de red para permitir acceso externo
builder.WebHost.UseUrls("http://0.0.0.0:5200");

// Add services to the container.
builder.Services.AddScoped<IOrderService, OrderService>();
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

// Forwarded Headers & HTTPS Configuration for Reverse Proxy (Traefik/Nginx)
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                               Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = 443;
});

var app = builder.Build();

app.UseForwardedHeaders();

// Global Exception Handler
app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        if (exceptionHandlerPathFeature?.Error != null)
        {
            var ex = exceptionHandlerPathFeature.Error;
            Log.Error(ex, "Excepción global no manejada");
            await context.Response.WriteAsJsonAsync(new { error = "Ocurrió un error interno en el servidor.", message = ex.Message });
        }
    });
});

// Configure the HTTP request pipeline.
/*
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
*/

app.UseSerilogRequestLogging();
app.UseCors();

// Servir el frontend directamente desde el API
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// EF Core Migrations (Shadow Apply for Production)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();

    try
    {
        await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Permissions') BEGIN ALTER TABLE Users ADD Permissions NVARCHAR(MAX) NULL; END;");
    }
    catch { }

    bool schemaExists = false;
    try
    {
        await context.Database.ExecuteSqlRawAsync("SELECT TOP 1 1 FROM [Products]");
        schemaExists = true;
    }
    catch { /* Table doesn't exist */ }

    if (schemaExists)
    {
        bool historyExists = false;
        try
        {
            await context.Database.ExecuteSqlRawAsync("SELECT TOP 1 1 FROM [__EFMigrationsHistory]");
            historyExists = true;
        }
        catch { /* Table doesn't exist */ }

        if (!historyExists)
        {
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE [__EFMigrationsHistory] (
                    [MigrationId] nvarchar(150) NOT NULL,
                    [ProductVersion] nvarchar(32) NOT NULL,
                    CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
                );
            ");
            
            var initialMigrationName = Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.GetPendingMigrations(context.Database).FirstOrDefault();
            if (initialMigrationName != null)
            {
                await context.Database.ExecuteSqlRawAsync(
                    $"INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES ('{initialMigrationName}', '8.0.0')"
                );
            }
        }
    }

    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'MinStock')
            BEGIN
                ALTER TABLE Products ADD MinStock INT NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'MaxStock')
            BEGIN
                ALTER TABLE Products ADD MaxStock INT NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'IsPerishable')
            BEGIN
                ALTER TABLE Products ADD IsPerishable BIT NOT NULL DEFAULT 0;
            END;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'OriginalTotalAmount')
            BEGIN
                ALTER TABLE PurchaseOrders ADD OriginalTotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'ReceivedDate')
            BEGIN
                ALTER TABLE PurchaseOrders ADD ReceivedDate DATETIME2 NULL;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'ReceivedById')
            BEGIN
                ALTER TABLE PurchaseOrders ADD ReceivedById INT NULL;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'ReceptionNotes')
            BEGIN
                ALTER TABLE PurchaseOrders ADD ReceptionNotes NVARCHAR(MAX) NULL;
            END;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'OrderedQuantity')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD OrderedQuantity INT NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'ReceivedQuantity')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD ReceivedQuantity INT NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'OrderedUnitCost')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD OrderedUnitCost DECIMAL(18,2) NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'ReceivedUnitCost')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD ReceivedUnitCost DECIMAL(18,2) NOT NULL DEFAULT 0;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'Location')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD Location NVARCHAR(100) NULL;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'VarianceReason')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD VarianceReason NVARCHAR(500) NULL;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Permissions')
            BEGIN
                ALTER TABLE Users ADD Permissions NVARCHAR(MAX) NULL;
            END;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrderDetails') AND name = 'IsAdditional')
            BEGIN
                ALTER TABLE PurchaseOrderDetails ADD IsAdditional BIT NOT NULL DEFAULT 0;
            END;
        ");
    }
    catch { /* Column safety check */ }

    // Safely apply any remaining migrations
    try {
        await context.Database.MigrateAsync();
    } catch { /* Migrations already applied */ }

    // Seeding Logic
    await DbSeeder.SeedAsync(context);
    
    var demoUser = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Users, u => u.Email == "demo@abarrotera.mx");
    if (demoUser != null) {
        demoUser.Password = BCrypt.Net.BCrypt.HashPassword("123456");
    }

    var usersToUpdate = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
        System.Linq.Queryable.Where(context.Users, u => !u.Password!.StartsWith("$"))
    );
    foreach(var u in usersToUpdate) {
        u.Password = BCrypt.Net.BCrypt.HashPassword(u.Password);
    }
    await context.SaveChangesAsync();
}

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "La aplicación falló al iniciar.");
}
finally
{
    Log.CloseAndFlush();
}
