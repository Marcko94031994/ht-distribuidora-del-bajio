using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRFCAndAddressToProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Permissions",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Providers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RFC",
                table: "Providers",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Permissions",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "RFC",
                table: "Providers");
        }
    }
}
