using System;
using System.Threading.Tasks;

namespace HTLogistics.Api.Services.Finkok
{
    public interface IFinkokService
    {
        Task<FinkokStampResult> TimbrarAsync(string xml);
    }

    public class FinkokStampResult
    {
        public bool Success { get; set; }
        public string? XmlTimbrado { get; set; }
        public string? UUID { get; set; }
        public string? ErrorMessage { get; set; }
        public string? ErrorCode { get; set; }
    }
}
