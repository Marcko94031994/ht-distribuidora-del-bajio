using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HTLogisticsV2.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductMinMaxStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxStock",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinStock",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxStock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "MinStock",
                table: "Products");
        }
    }
}
