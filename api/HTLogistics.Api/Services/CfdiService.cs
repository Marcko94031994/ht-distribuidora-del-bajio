using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;
using HTLogistics.Api.Models;
using System.Linq;

namespace HTLogistics.Api.Services
{
    public class CfdiService : ICfdiService
    {
        private readonly IConfiguration _config;

        public CfdiService(IConfiguration config)
        {
            _config = config;
        }

        public Task<string> GenerarIngresoAsync(Order order, string folio)
        {
            var rfc = _config["EmisorSettings:RFC"];
            var nombre = _config["EmisorSettings:Nombre"];
            var regimen = _config["EmisorSettings:RegimenFiscal"];
            var cp = _config["EmisorSettings:CodigoPostal"];
            
            string xmlStr = CfdiXmlBuilder.BuildIngresoXml(order, rfc, nombre, regimen, cp, folio);
            return Task.FromResult(xmlStr);
        }

        public Task<string> GenerarEgresoAsync(CreditNote nota, string folio)
        {
            var rfc = _config["EmisorSettings:RFC"];
            var nombre = _config["EmisorSettings:Nombre"];
            var regimen = _config["EmisorSettings:RegimenFiscal"];
            var cp = _config["EmisorSettings:CodigoPostal"];
            
            string xmlStr = CfdiXmlBuilder.BuildEgresoXml(nota, rfc, nombre, regimen, cp, folio);
            return Task.FromResult(xmlStr);
        }

        public Task<string> GenerarComplementoPagoAsync(ClientPayment pago, string folio)
        {
            var rfc = _config["EmisorSettings:RFC"];
            var nombre = _config["EmisorSettings:Nombre"];
            var regimen = _config["EmisorSettings:RegimenFiscal"];
            var cp = _config["EmisorSettings:CodigoPostal"];
            
            string xmlStr = CfdiXmlBuilder.BuildPagoXml(pago, rfc, nombre, regimen, cp, folio);
            return Task.FromResult(xmlStr);
        }

        public string SellarXml(string xmlSinSello, string keyPath, string password)
        {
            string cerPath = _config["FinkokSettings:CerPath"];
            
            var cert = new X509Certificate2(cerPath);
            string certificadoBase64 = Convert.ToBase64String(cert.RawData);
            
            string serial = cert.GetSerialNumberString();
            StringBuilder noCertificado = new StringBuilder();
            for (int i = 0; i < serial.Length; i += 2)
            {
                noCertificado.Append((char)int.Parse(serial.Substring(i, 2), System.Globalization.NumberStyles.HexNumber));
            }
            
            var doc = XDocument.Parse(xmlSinSello);
            var comprobante = doc.Root;
            comprobante.SetAttributeValue("Certificado", certificadoBase64);
            comprobante.SetAttributeValue("NoCertificado", noCertificado.ToString());

            // MANUAL CADENA ORIGINAL GENERATOR for CFDI 4.0 Ingreso
            var sb = new StringBuilder();
            sb.Append("||4.0");
            sb.Append("|").Append(comprobante.Attribute("Serie")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("Folio")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("Fecha")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("FormaPago")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("NoCertificado")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("SubTotal")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("Moneda")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("Total")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("TipoDeComprobante")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("Exportacion")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("MetodoPago")?.Value ?? "");
            sb.Append("|").Append(comprobante.Attribute("LugarExpedicion")?.Value ?? "");
            
            var emisor = comprobante.Elements().First(e => e.Name.LocalName == "Emisor");
            sb.Append("|").Append(emisor.Attribute("Rfc")?.Value ?? "");
            sb.Append("|").Append(emisor.Attribute("Nombre")?.Value ?? "");
            sb.Append("|").Append(emisor.Attribute("RegimenFiscal")?.Value ?? "");
            
            var receptor = comprobante.Elements().First(e => e.Name.LocalName == "Receptor");
            sb.Append("|").Append(receptor.Attribute("Rfc")?.Value ?? "");
            sb.Append("|").Append(receptor.Attribute("Nombre")?.Value ?? "");
            sb.Append("|").Append(receptor.Attribute("DomicilioFiscalReceptor")?.Value ?? "");
            sb.Append("|").Append(receptor.Attribute("RegimenFiscalReceptor")?.Value ?? "");
            sb.Append("|").Append(receptor.Attribute("UsoCFDI")?.Value ?? "");

            var conceptos = comprobante.Elements().First(e => e.Name.LocalName == "Conceptos");
            foreach (var concepto in conceptos.Elements())
            {
                sb.Append("|").Append(concepto.Attribute("ClaveProdServ")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("NoIdentificacion")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("Cantidad")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("ClaveUnidad")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("Unidad")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("Descripcion")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("ValorUnitario")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("Importe")?.Value ?? "");
                sb.Append("|").Append(concepto.Attribute("ObjetoImp")?.Value ?? "");

                var conceptoImpuestos = concepto.Elements().FirstOrDefault(e => e.Name.LocalName == "Impuestos");
                if (conceptoImpuestos != null)
                {
                    var traslados = conceptoImpuestos.Elements().FirstOrDefault(e => e.Name.LocalName == "Traslados");
                    if (traslados != null)
                    {
                        foreach (var traslado in traslados.Elements())
                        {
                            sb.Append("|").Append(traslado.Attribute("Base")?.Value ?? "");
                            sb.Append("|").Append(traslado.Attribute("Impuesto")?.Value ?? "");
                            sb.Append("|").Append(traslado.Attribute("TipoFactor")?.Value ?? "");
                            sb.Append("|").Append(traslado.Attribute("TasaOCuota")?.Value ?? "");
                            sb.Append("|").Append(traslado.Attribute("Importe")?.Value ?? "");
                        }
                    }
                }
            }

            var globalImpuestos = comprobante.Elements().FirstOrDefault(e => e.Name.LocalName == "Impuestos");
            if (globalImpuestos != null)
            {
                sb.Append("|").Append(globalImpuestos.Attribute("TotalImpuestosTrasladados")?.Value ?? "");
                var traslados = globalImpuestos.Elements().FirstOrDefault(e => e.Name.LocalName == "Traslados");
                if (traslados != null)
                {
                    foreach (var traslado in traslados.Elements())
                    {
                        sb.Append("|").Append(traslado.Attribute("Base")?.Value ?? "");
                        sb.Append("|").Append(traslado.Attribute("Impuesto")?.Value ?? "");
                        sb.Append("|").Append(traslado.Attribute("TipoFactor")?.Value ?? "");
                        sb.Append("|").Append(traslado.Attribute("TasaOCuota")?.Value ?? "");
                        sb.Append("|").Append(traslado.Attribute("Importe")?.Value ?? "");
                    }
                }
            }

            var complemento = comprobante.Elements().FirstOrDefault(e => e.Name.LocalName == "Complemento");
            if (complemento != null)
            {
                var pagos = complemento.Elements().FirstOrDefault(e => e.Name.LocalName == "Pagos");
                if (pagos != null)
                {
                    sb.Append("|").Append(pagos.Attribute("Version")?.Value ?? "");
                    var totales = pagos.Elements().FirstOrDefault(e => e.Name.LocalName == "Totales");
                    if (totales != null)
                    {
                        sb.Append("|").Append(totales.Attribute("MontoTotalPagos")?.Value ?? "");
                    }
                    foreach (var pagoObj in pagos.Elements().Where(e => e.Name.LocalName == "Pago"))
                    {
                        sb.Append("|").Append(pagoObj.Attribute("FechaPago")?.Value ?? "");
                        sb.Append("|").Append(pagoObj.Attribute("FormaDePagoP")?.Value ?? "");
                        sb.Append("|").Append(pagoObj.Attribute("MonedaP")?.Value ?? "");
                        sb.Append("|").Append(pagoObj.Attribute("Monto")?.Value ?? "");
                        sb.Append("|").Append(pagoObj.Attribute("TipoCambioP")?.Value ?? "");
                    }
                }
            }

            sb.Append("||");
            string cadenaOriginal = sb.ToString();
            
            while (cadenaOriginal.Contains("|||")) 
            {
                cadenaOriginal = cadenaOriginal.Replace("|||", "||");
            }

            byte[] keyBytes = File.ReadAllBytes(keyPath);
            using var rsa = RSA.Create();
            rsa.ImportEncryptedPkcs8PrivateKey(Encoding.UTF8.GetBytes(password), keyBytes, out _);
            
            byte[] signature = rsa.SignData(Encoding.UTF8.GetBytes(cadenaOriginal), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            string sello = Convert.ToBase64String(signature);
            
            comprobante.SetAttributeValue("Sello", sello);
            
            return comprobante.ToString(SaveOptions.DisableFormatting);
        }
    }
}
