using System.Threading.Tasks;
using HTLogistics.Api.Models;

namespace HTLogistics.Api.Services.Interfaces
{
    public interface IOrderService
    {
        Task<Order?> GetOrderByIdAsync(int id);
        Task<Order?> AuthorizeOrderAsync(int id, int userId);
        Task<Order?> UpdateOrderStatusAsync(int id, string status, int userId);
    }
}
