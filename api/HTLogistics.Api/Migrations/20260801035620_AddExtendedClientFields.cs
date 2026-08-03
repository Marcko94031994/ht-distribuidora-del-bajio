using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedClientFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Celular",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Colonia",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email1",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email2",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email3",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FormaPago",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBlocked",
                table: "Clients",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Localidad",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetodoPago",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Municipio",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Referencia",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Telefonos",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UsoCFDI",
                table: "Clients",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Celular",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Colonia",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Email1",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Email2",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Email3",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "FormaPago",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "IsBlocked",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Localidad",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "MetodoPago",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Municipio",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Referencia",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Telefonos",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "UsoCFDI",
                table: "Clients");
        }
    }
}
