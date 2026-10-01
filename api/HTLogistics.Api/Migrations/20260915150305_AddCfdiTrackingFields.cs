using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCfdiTrackingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DriverId",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleId",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaFacturacion",
                table: "CreditNotes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FolioFiscal",
                table: "CreditNotes",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFacturado",
                table: "CreditNotes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaFacturacion",
                table: "ClientPayments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FolioFiscal",
                table: "ClientPayments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFacturado",
                table: "ClientPayments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Users_DriverId",
                table: "Users",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_VehicleId",
                table: "Orders",
                column: "VehicleId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Vehicles_VehicleId",
                table: "Orders",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Drivers_DriverId",
                table: "Users",
                column: "DriverId",
                principalTable: "Drivers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Vehicles_VehicleId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Drivers_DriverId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_DriverId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Orders_VehicleId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DriverId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FechaFacturacion",
                table: "CreditNotes");

            migrationBuilder.DropColumn(
                name: "FolioFiscal",
                table: "CreditNotes");

            migrationBuilder.DropColumn(
                name: "IsFacturado",
                table: "CreditNotes");

            migrationBuilder.DropColumn(
                name: "FechaFacturacion",
                table: "ClientPayments");

            migrationBuilder.DropColumn(
                name: "FolioFiscal",
                table: "ClientPayments");

            migrationBuilder.DropColumn(
                name: "IsFacturado",
                table: "ClientPayments");
        }
    }
}
