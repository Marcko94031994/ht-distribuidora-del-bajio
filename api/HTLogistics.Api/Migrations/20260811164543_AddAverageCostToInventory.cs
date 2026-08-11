using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAverageCostToInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "OriginalTotalAmount",
                table: "PurchaseOrders",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ReceivedById",
                table: "PurchaseOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedDate",
                table: "PurchaseOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceptionNotes",
                table: "PurchaseOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAdditional",
                table: "PurchaseOrderDetails",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "PurchaseOrderDetails",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrderedQuantity",
                table: "PurchaseOrderDetails",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "OrderedUnitCost",
                table: "PurchaseOrderDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ReceivedQuantity",
                table: "PurchaseOrderDetails",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "ReceivedUnitCost",
                table: "PurchaseOrderDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "VarianceReason",
                table: "PurchaseOrderDetails",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AverageCost",
                table: "Products",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AverageCost",
                table: "InventoryMovements",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "InventoryMovements",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql(@"
                UPDATE Products SET AverageCost = Cost;
                UPDATE InventoryMovements 
                SET AverageCost = (SELECT Cost FROM Products WHERE Products.Id = InventoryMovements.ProductId),
                    UnitCost = (SELECT Cost FROM Products WHERE Products.Id = InventoryMovements.ProductId);
            ");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_ReceivedById",
                table: "PurchaseOrders",
                column: "ReceivedById");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Users_ReceivedById",
                table: "PurchaseOrders",
                column: "ReceivedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Users_ReceivedById",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_ReceivedById",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "OriginalTotalAmount",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "ReceivedById",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "ReceivedDate",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "ReceptionNotes",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "IsAdditional",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "OrderedQuantity",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "OrderedUnitCost",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "ReceivedQuantity",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "ReceivedUnitCost",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "VarianceReason",
                table: "PurchaseOrderDetails");

            migrationBuilder.DropColumn(
                name: "AverageCost",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "AverageCost",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "InventoryMovements");
        }
    }
}
