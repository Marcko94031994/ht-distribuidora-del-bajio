using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFolioFactura : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FolioFactura",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FolioFactura",
                table: "CreditNotes",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FolioFactura",
                table: "ClientPayments",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FolioFactura",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FolioFactura",
                table: "CreditNotes");

            migrationBuilder.DropColumn(
                name: "FolioFactura",
                table: "ClientPayments");
        }
    }
}
