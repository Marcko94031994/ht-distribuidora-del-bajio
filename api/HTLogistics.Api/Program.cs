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
    
    // Auto-migration for CommittedStock and CurrentBalance
    try {
        await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'CommittedStock') ALTER TABLE [Products] ADD [CommittedStock] int NOT NULL DEFAULT 0;");
        await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Providers]') AND name = 'CurrentBalance') ALTER TABLE [Providers] ADD [CurrentBalance] decimal(18,2) NOT NULL DEFAULT 0;");
        
        // Also create ProviderPayments table if missing
        await context.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ProviderPayments]') AND type in (N'U'))
            CREATE TABLE [ProviderPayments] (
                [Id] int NOT NULL IDENTITY,
                [ProviderId] int NOT NULL,
                [Amount] decimal(18,2) NOT NULL,
                [Date] datetime2 NOT NULL,
                [Reference] nvarchar(max) NULL,
                [PaymentMethod] nvarchar(max) NULL,
                CONSTRAINT [PK_ProviderPayments] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_ProviderPayments_Providers_ProviderId] FOREIGN KEY ([ProviderId]) REFERENCES [Providers] ([Id]) ON DELETE CASCADE
            );
        ");
    } catch { }

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
