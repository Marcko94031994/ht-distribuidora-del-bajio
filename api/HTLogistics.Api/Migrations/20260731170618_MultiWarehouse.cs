using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class MultiWarehouse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_WarehouseLocations_WarehouseLocationId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_WarehouseLocationId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CommittedStock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Stock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "WarehouseLocationId",
                table: "Products");

            migrationBuilder.AlterColumn<int>(
                name: "WarehouseId",
                table: "Products",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<bool>(
                name: "IsPerishable",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "WarehouseId",
                table: "ProductBatches",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WarehouseId",
                table: "InventoryMovements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductInventories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    WarehouseLocationId = table.Column<int>(type: "int", nullable: true),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    CommittedStock = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductInventories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductInventories_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductInventories_WarehouseLocations_WarehouseLocationId",
                        column: x => x.WarehouseLocationId,
                        principalTable: "WarehouseLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductInventories_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_WarehouseId",
                table: "ProductBatches",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_WarehouseId",
                table: "InventoryMovements",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductInventories_ProductId",
                table: "ProductInventories",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductInventories_WarehouseId",
                table: "ProductInventories",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductInventories_WarehouseLocationId",
                table: "ProductInventories",
                column: "WarehouseLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryMovements_Warehouses_WarehouseId",
                table: "InventoryMovements",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductBatches_Warehouses_WarehouseId",
                table: "ProductBatches",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryMovements_Warehouses_WarehouseId",
                table: "InventoryMovements");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductBatches_Warehouses_WarehouseId",
                table: "ProductBatches");

            migrationBuilder.DropTable(
                name: "ProductInventories");

            migrationBuilder.DropIndex(
                name: "IX_ProductBatches_WarehouseId",
                table: "ProductBatches");

            migrationBuilder.DropIndex(
                name: "IX_InventoryMovements_WarehouseId",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "IsPerishable",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "ProductBatches");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "InventoryMovements");

            migrationBuilder.AlterColumn<int>(
                name: "WarehouseId",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CommittedStock",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Stock",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WarehouseLocationId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_WarehouseLocationId",
                table: "Products",
                column: "WarehouseLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_WarehouseLocations_WarehouseLocationId",
                table: "Products",
                column: "WarehouseLocationId",
                principalTable: "WarehouseLocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
