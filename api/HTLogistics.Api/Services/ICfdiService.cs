using System.Threading.Tasks;
using HTLogistics.Api.Models;

namespace HTLogistics.Api.Services
{
    public interface ICfdiService
    {
        Task<string> GenerarIngresoAsync(Order orden, string folio);
        Task<string> GenerarEgresoAsync(CreditNote nota, string folio);
        Task<string> GenerarComplementoPagoAsync(ClientPayment pago, string folio);
        string SellarXml(string xmlSinSello, string keyPath, string password);
    }
}
