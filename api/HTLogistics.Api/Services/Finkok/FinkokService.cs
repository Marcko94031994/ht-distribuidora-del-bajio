using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace HTLogistics.Api.Services.Finkok
{
    public class FinkokService : IFinkokService
    {
        private readonly IConfiguration _configuration;

        public FinkokService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<FinkokStampResult> TimbrarAsync(string xml)
        {
            var username = _configuration["FinkokSettings:Username"];
            var password = _configuration["FinkokSettings:Password"];
            var url = _configuration["FinkokSettings:Url"];

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(url))
            {
                throw new Exception("Finkok settings are missing in configuration.");
            }

            var binding = new System.ServiceModel.BasicHttpBinding(System.ServiceModel.BasicHttpSecurityMode.Transport);
            binding.MaxReceivedMessageSize = 20000000;
            var endpoint = new System.ServiceModel.EndpointAddress(url);

            var client = new ApplicationClient(binding, endpoint);

            var request = new sign_stamp
            {
                xml = Encoding.UTF8.GetBytes(xml),
                username = username,
                password = password
            };

            try
            {
                var response = await client.sign_stampAsync(request);
                var acuse = response.sign_stampResponse.sign_stampResult;

                if (!string.IsNullOrEmpty(acuse.UUID))
                {
                    return new FinkokStampResult
                    {
                        Success = true,
                        UUID = acuse.UUID,
                        XmlTimbrado = acuse.xml
                    };
                }
                
                // If there's an error, typically UUID is null or empty.
                string errorMessage = acuse.faultstring ?? "";
                if (acuse.Incidencias != null && acuse.Incidencias.Length > 0)
                {
                    var errorDetails = new System.Collections.Generic.List<string>();
                    foreach (var incidencia in acuse.Incidencias)
                    {
                        errorDetails.Add($"{incidencia.CodigoError}: {incidencia.MensajeIncidencia}");
                    }
                    errorMessage = string.Join(" | ", errorDetails);
                }

                return new FinkokStampResult
                {
                    Success = false,
                    ErrorMessage = errorMessage,
                    ErrorCode = acuse.CodEstatus
                };
            }
            catch (Exception ex)
            {
                return new FinkokStampResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }
    }
}
