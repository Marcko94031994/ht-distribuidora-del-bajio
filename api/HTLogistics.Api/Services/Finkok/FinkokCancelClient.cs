using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Configuration;

namespace HTLogistics.Api.Services.Finkok
{
    public class FinkokCancelResult
    {
        public bool Success { get; set; }
        public string? Mensaje { get; set; }
        public string? Acuse { get; set; }
    }

    public class FinkokCancelClient
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public FinkokCancelClient(IConfiguration config, HttpClient httpClient)
        {
            _config = config;
            _httpClient = httpClient;
        }

        public async Task<FinkokCancelResult> CancelarAsync(string uuid, string rfcEmisor, string motivo = "02", string folioSustitucion = "")
        {
            string url = "https://demo-facturacion.finkok.com/servicios/soap/cancel"; // Use demo or prod from config
            string username = _config["FinkokSettings:Username"] ?? "";
            string password = _config["FinkokSettings:Password"] ?? "";
            string cerPath = _config["FinkokSettings:CerPath"] ?? "";
            string keyPath = _config["FinkokSettings:KeyPath"] ?? "";

            if (!File.Exists(cerPath) || !File.Exists(keyPath))
            {
                return new FinkokCancelResult { Success = false, Mensaje = "Archivos CSD no encontrados." };
            }

            string keyPassword = _config["FinkokSettings:KeyPassword"] ?? "";
            string cerBase64 = Convert.ToBase64String(File.ReadAllBytes(cerPath));
            
            // Decrypt key and convert to PEM for Finkok cancel
            byte[] keyBytes = File.ReadAllBytes(keyPath);
            using var rsa = RSA.Create();
            rsa.ImportEncryptedPkcs8PrivateKey(Encoding.UTF8.GetBytes(keyPassword), keyBytes, out _);
            // Finkok might expect PKCS#1 (RSA PRIVATE KEY) instead of PKCS#8 (PRIVATE KEY)
            string keyPem = rsa.ExportRSAPrivateKeyPem();
            
            // Finkok Cancel uses xs:base64Binary for the 'key' element, so we must Base64-encode the PEM text itself.
            string keyBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(keyPem));

            string soapAction = "\"\"";

            string requestXml = $@"<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/"" xmlns:can=""http://facturacion.finkok.com/cancel"" xmlns:can1=""http://facturacion.finkok.com/cancellation"">
   <soapenv:Header/>
   <soapenv:Body>
      <can:cancel>
         <can:UUIDS>
            <can:UUID UUID=""{uuid}"" Motivo=""{motivo}"" FolioSustitucion=""{folioSustitucion}"" />
         </can:UUIDS>
         <can:username>{username}</can:username>
         <can:password>{password}</can:password>
         <can:taxpayer_id>{rfcEmisor}</can:taxpayer_id>
         <can:cer>{cerBase64}</can:cer>
         <can:key>{keyBase64}</can:key>
      </can:cancel>
   </soapenv:Body>
</soapenv:Envelope>";

            var content = new StringContent(requestXml, Encoding.UTF8, "text/xml");
            content.Headers.Add("SOAPAction", soapAction);

            try
            {
                var response = await _httpClient.PostAsync(url, content);
                var responseXml = await response.Content.ReadAsStringAsync();

                // Analizar la respuesta XML para saber si fue exitoso
                var doc = XDocument.Parse(responseXml);
                
                // Buscar si hay <faultstring>
                var faultstring = doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "faultstring")?.Value;
                if (!string.IsNullOrEmpty(faultstring))
                {
                    return new FinkokCancelResult { Success = false, Mensaje = faultstring };
                }
                
                if (!response.IsSuccessStatusCode)
                {
                    return new FinkokCancelResult { Success = false, Mensaje = "HTTP Error: " + response.StatusCode + "\n" + responseXml };
                }

                // Buscar UUID estatus en cancelResult -> Folios -> Folio -> EstatusUUID
                XNamespace canResult = "http://facturacion.finkok.com/cancel";
                XNamespace cancelNS = "http://facturacion.finkok.com/cancellation";
                
                var folioNode = doc.Descendants(cancelNS + "Folio").FirstOrDefault();
                var codEstatusNode = doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "CodEstatus");
                string codEstatus = codEstatusNode?.Value ?? "";

                var folioNodeAny = doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "Folio");

                if (folioNodeAny != null)
                {
                    string estatusUUID = folioNodeAny.Elements().FirstOrDefault(e => e.Name.LocalName == "EstatusUUID")?.Value ?? "";
                    
                    if (estatusUUID == "201" || estatusUUID == "202")
                    {
                        var acuseNode = doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "Acuse");
                        return new FinkokCancelResult { Success = true, Mensaje = $"Estatus: {estatusUUID}. {codEstatus}", Acuse = acuseNode?.Value };
                    }
                    else
                    {
                        return new FinkokCancelResult { Success = false, Mensaje = $"EstatusUUID: {estatusUUID}. CodEstatus: {codEstatus}" };
                    }
                }

                if (!string.IsNullOrEmpty(codEstatus))
                {
                    return new FinkokCancelResult { Success = false, Mensaje = codEstatus };
                }

                return new FinkokCancelResult { Success = false, Mensaje = "Respuesta de Finkok sin EstatusUUID ni CodEstatus." };
            }
            catch (Exception ex)
            {
                return new FinkokCancelResult { Success = false, Mensaje = ex.Message };
            }
        }
    }
}
