using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class PurchaseOrderMasterDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Products_ProductId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_ProductId",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "BatchNumber",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "PurchaseOrders");

            migrationBuilder.RenameColumn(
                name: "ExpirationDate",
                table: "PurchaseOrders",
                newName: "AuthorizedDate");

            migrationBuilder.RenameColumn(
                name: "Cost",
                table: "PurchaseOrders",
                newName: "TotalAmount");

            migrationBuilder.AddColumn<int>(
                name: "AuthorizedById",
                table: "PurchaseOrders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PurchaseOrderDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseOrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: true),
                    BatchNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExpirationDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderDetails_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderDetails_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderDetails_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_AuthorizedById",
                table: "PurchaseOrders",
                column: "AuthorizedById");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderDetails_ProductId",
                table: "PurchaseOrderDetails",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderDetails_PurchaseOrderId",
                table: "PurchaseOrderDetails",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderDetails_WarehouseId",
                table: "PurchaseOrderDetails",
                column: "WarehouseId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Users_AuthorizedById",
                table: "PurchaseOrders",
                column: "AuthorizedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Users_AuthorizedById",
                table: "PurchaseOrders");

            migrationBuilder.DropTable(
                name: "PurchaseOrderDetails");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_AuthorizedById",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "AuthorizedById",
                table: "PurchaseOrders");

            migrationBuilder.RenameColumn(
                name: "TotalAmount",
                table: "PurchaseOrders",
                newName: "Cost");

            migrationBuilder.RenameColumn(
                name: "AuthorizedDate",
                table: "PurchaseOrders",
                newName: "ExpirationDate");

            migrationBuilder.AddColumn<string>(
                name: "BatchNumber",
                table: "PurchaseOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProductId",
                table: "PurchaseOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "PurchaseOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_ProductId",
                table: "PurchaseOrders",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Products_ProductId",
                table: "PurchaseOrders",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
