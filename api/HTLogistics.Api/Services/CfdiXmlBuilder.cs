using System;
using System.Collections.Generic;
using System.Xml.Linq;
using HTLogistics.Api.Models;

namespace HTLogistics.Api.Services
{
    public class CfdiXmlBuilder
    {
        public static string BuildIngresoXml(Order order, string rfcEmisor, string nombreEmisor, string regimenFiscalEmisor, string cpEmisor, string folio)
        {
            XNamespace cfdi = "http://www.sat.gob.mx/cfd/4";
            XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";

            string rfcReceptor = order.Client?.RFC ?? "XAXX010101000";
            string cpReceptor = order.Client?.CodigoPostal ?? cpEmisor;
            if (rfcReceptor == "XAXX010101000" || rfcReceptor == "XEXX010101000") cpReceptor = cpEmisor;
            
            string formaPago = order.Client?.FormaPago ?? "99";
            formaPago = formaPago.Trim();
            if (formaPago.Length == 1) formaPago = "0" + formaPago;
            if (formaPago.Length != 2) formaPago = "99";

            var comprobante = new XElement(cfdi + "Comprobante",
                new XAttribute(XNamespace.Xmlns + "cfdi", cfdi.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "xsi", xsi.NamespaceName),
                new XAttribute(xsi + "schemaLocation", "http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"),
                new XAttribute("Version", "4.0"),
                new XAttribute("Serie", "A"),
                new XAttribute("Folio", folio ?? order.OrderNumber ?? ""),
                new XAttribute("Fecha", DateTime.UtcNow.AddHours(-6).ToString("yyyy-MM-ddTHH:mm:ss")),
                new XAttribute("Sello", ""),
                new XAttribute("FormaPago", formaPago),
                new XAttribute("NoCertificado", ""),
                new XAttribute("Certificado", ""),
                new XAttribute("SubTotal", (order.TotalAmount - order.TotalTax).ToString("F2")),
                new XAttribute("Moneda", "MXN"),
                new XAttribute("Total", order.TotalAmount.ToString("F2")),
                new XAttribute("TipoDeComprobante", "I"),
                new XAttribute("Exportacion", "01"),
                new XAttribute("MetodoPago", order.Client?.MetodoPago ?? "PPD"),
                new XAttribute("LugarExpedicion", cpEmisor)
            );

            comprobante.Add(new XElement(cfdi + "Emisor",
                new XAttribute("Rfc", rfcEmisor),
                new XAttribute("Nombre", nombreEmisor),
                new XAttribute("RegimenFiscal", regimenFiscalEmisor)
            ));

            string regimenRec = order.Client?.RegimenFiscal ?? "616";
            string usoCfdi = order.Client?.UsoCFDI ?? "G03";
            if (rfcReceptor == "XAXX010101000" || rfcReceptor == "XEXX010101000") {
                regimenRec = "616";
                usoCfdi = "S01";
            }

            comprobante.Add(new XElement(cfdi + "Receptor",
                new XAttribute("Rfc", order.Client?.RFC ?? "XAXX010101000"),
                new XAttribute("Nombre", order.Client?.RazonSocial ?? order.Client?.Name ?? "PUBLICO EN GENERAL"),
                new XAttribute("DomicilioFiscalReceptor", cpReceptor),
                new XAttribute("RegimenFiscalReceptor", regimenRec),
                new XAttribute("UsoCFDI", usoCfdi)
            ));

            var conceptos = new XElement(cfdi + "Conceptos");
            decimal calculatedSubTotal = 0;
            decimal calculatedTotalTax = 0;

            var validItems = System.Linq.Enumerable.ToList(System.Linq.Enumerable.Where(order.Items, x => x.UnitPrice > 0));
            if (validItems.Count == 0) throw new System.Exception("CFDI40166: El SAT no permite facturar tickets con valor total de cero. Todos los conceptos tienen valor 0.");
            foreach (var item in validItems)
            {
                var amountBase = Math.Round(item.Quantity * item.UnitPrice, 2);
                var taxAmount = Math.Round(amountBase * 0.16m, 2);
                
                calculatedSubTotal += amountBase;
                calculatedTotalTax += taxAmount;

                var concepto = new XElement(cfdi + "Concepto",
                    new XAttribute("ClaveProdServ", item.Product?.SatProductKey ?? "01010101"),
                    new XAttribute("NoIdentificacion", item.Product?.SKU ?? item.Product?.Id.ToString()),
                    new XAttribute("Cantidad", item.Quantity.ToString("F2")),
                    new XAttribute("ClaveUnidad", item.Product?.SatUnitKey ?? "H87"),
                    new XAttribute("Unidad", item.Product?.UnitOfMeasure ?? "Pieza"),
                    new XAttribute("Descripcion", item.Product?.Name ?? "Producto"),
                    new XAttribute("ValorUnitario", item.UnitPrice.ToString("F2")),
                    new XAttribute("Importe", amountBase.ToString("F2")),
                    new XAttribute("ObjetoImp", "02")
                );

                var impuestos = new XElement(cfdi + "Impuestos",
                    new XElement(cfdi + "Traslados",
                        new XElement(cfdi + "Traslado",
                            new XAttribute("Base", amountBase.ToString("F2")),
                            new XAttribute("Impuesto", "002"),
                            new XAttribute("TipoFactor", "Tasa"),
                            new XAttribute("TasaOCuota", "0.160000"),
                            new XAttribute("Importe", taxAmount.ToString("F2"))
                        )
                    )
                );
                concepto.Add(impuestos);
                conceptos.Add(concepto);
            }
            comprobante.Add(conceptos);

            comprobante.Add(new XElement(cfdi + "Impuestos",
                new XAttribute("TotalImpuestosTrasladados", calculatedTotalTax.ToString("F2")),
                new XElement(cfdi + "Traslados",
                    new XElement(cfdi + "Traslado",
                        new XAttribute("Base", calculatedSubTotal.ToString("F2")),
                        new XAttribute("Impuesto", "002"),
                        new XAttribute("TipoFactor", "Tasa"),
                        new XAttribute("TasaOCuota", "0.160000"),
                        new XAttribute("Importe", calculatedTotalTax.ToString("F2"))
                    )
                )
            ));

            comprobante.Attribute("SubTotal")?.SetValue(calculatedSubTotal.ToString("F2"));
            comprobante.Attribute("Total")?.SetValue((calculatedSubTotal + calculatedTotalTax).ToString("F2"));

            return comprobante.ToString();
        }

        public static string BuildEgresoXml(CreditNote nc, string rfcEmisor, string nombreEmisor, string regimenFiscalEmisor, string cpEmisor, string folio)
        {
            XNamespace cfdi = "http://www.sat.gob.mx/cfd/4";
            XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";

            var comprobante = new XElement(cfdi + "Comprobante",
                new XAttribute(XNamespace.Xmlns + "cfdi", cfdi.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "xsi", xsi.NamespaceName),
                new XAttribute(xsi + "schemaLocation", "http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"),
                new XAttribute("Version", "4.0"),
                new XAttribute("Serie", "NC"),
                new XAttribute("Folio", folio),
                new XAttribute("Fecha", DateTime.UtcNow.AddHours(-6).ToString("yyyy-MM-ddTHH:mm:ss")),
                new XAttribute("Sello", ""),
                new XAttribute("FormaPago", "99"), // Defaults to Por definir
                new XAttribute("NoCertificado", ""),
                new XAttribute("Certificado", ""),
                new XAttribute("SubTotal", (nc.Amount / 1.16m).ToString("F2")),
                new XAttribute("Moneda", "MXN"),
                new XAttribute("Total", nc.Amount.ToString("F2")),
                new XAttribute("TipoDeComprobante", "E"),
                new XAttribute("Exportacion", "01"),
                new XAttribute("MetodoPago", "PUE"),
                new XAttribute("LugarExpedicion", cpEmisor)
            );

            comprobante.Add(new XElement(cfdi + "Emisor",
                new XAttribute("Rfc", rfcEmisor),
                new XAttribute("Nombre", nombreEmisor),
                new XAttribute("RegimenFiscal", regimenFiscalEmisor)
            ));

            string rfcRec = nc.Client?.RFC ?? "XAXX010101000";
            string cpRec = nc.Client?.CodigoPostal ?? cpEmisor;
            if (rfcRec == "XAXX010101000" || rfcRec == "XEXX010101000") cpRec = cpEmisor;

            comprobante.Add(new XElement(cfdi + "Receptor",
                new XAttribute("Rfc", rfcRec),
                new XAttribute("Nombre", nc.Client?.RazonSocial ?? nc.Client?.Name ?? "PUBLICO EN GENERAL"),
                new XAttribute("DomicilioFiscalReceptor", cpRec),
                new XAttribute("RegimenFiscalReceptor", nc.Client?.RegimenFiscal ?? "616"),
                new XAttribute("UsoCFDI", "G02") // Devoluciones
            ));

            var conceptos = new XElement(cfdi + "Conceptos");
            var concepto = new XElement(cfdi + "Concepto",
                new XAttribute("ClaveProdServ", "84111506"), // Servicios de facturacion (default devolu)
                new XAttribute("Cantidad", "1"),
                new XAttribute("ClaveUnidad", "ACT"),
                new XAttribute("Descripcion", nc.Reason ?? "Devoluci�n"),
                new XAttribute("ValorUnitario", (nc.Amount / 1.16m).ToString("F2")),
                new XAttribute("Importe", (nc.Amount / 1.16m).ToString("F2")),
                new XAttribute("ObjetoImp", "02")
            );

            var amountBase = nc.Amount / 1.16m;
            var taxAmount = nc.Amount - amountBase;

            var impuestos = new XElement(cfdi + "Impuestos",
                new XElement(cfdi + "Traslados",
                    new XElement(cfdi + "Traslado",
                        new XAttribute("Base", amountBase.ToString("F2")),
                        new XAttribute("Impuesto", "002"),
                        new XAttribute("TipoFactor", "Tasa"),
                        new XAttribute("TasaOCuota", "0.160000"),
                        new XAttribute("Importe", taxAmount.ToString("F2"))
                    )
                )
            );
            concepto.Add(impuestos);
            conceptos.Add(concepto);
            
            comprobante.Add(conceptos);

            comprobante.Add(new XElement(cfdi + "Impuestos",
                new XAttribute("TotalImpuestosTrasladados", taxAmount.ToString("F2")),
                new XElement(cfdi + "Traslados",
                    new XElement(cfdi + "Traslado",
                        new XAttribute("Base", amountBase.ToString("F2")),
                        new XAttribute("Impuesto", "002"),
                        new XAttribute("TipoFactor", "Tasa"),
                        new XAttribute("TasaOCuota", "0.160000"),
                        new XAttribute("Importe", taxAmount.ToString("F2"))
                    )
                )
            ));

            return comprobante.ToString();
        }

        public static string BuildPagoXml(ClientPayment pago, string rfcEmisor, string nombreEmisor, string regimenFiscalEmisor, string cpEmisor, string folio)
        {
            XNamespace cfdi = "http://www.sat.gob.mx/cfd/4";
            XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";
            XNamespace pago20 = "http://www.sat.gob.mx/Pagos20";

            var comprobante = new XElement(cfdi + "Comprobante",
                new XAttribute(XNamespace.Xmlns + "cfdi", cfdi.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "xsi", xsi.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "pago20", pago20.NamespaceName),
                new XAttribute(xsi + "schemaLocation", "http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd"),
                new XAttribute("Version", "4.0"),
                new XAttribute("Serie", "P"),
                new XAttribute("Folio", folio),
                new XAttribute("Fecha", DateTime.UtcNow.AddHours(-6).ToString("yyyy-MM-ddTHH:mm:ss")),
                new XAttribute("Sello", ""),
                new XAttribute("NoCertificado", ""),
                new XAttribute("Certificado", ""),
                new XAttribute("SubTotal", "0"),
                new XAttribute("Moneda", "XXX"),
                new XAttribute("Total", "0"),
                new XAttribute("TipoDeComprobante", "P"),
                new XAttribute("Exportacion", "01"),
                new XAttribute("LugarExpedicion", cpEmisor)
            );

            comprobante.Add(new XElement(cfdi + "Emisor",
                new XAttribute("Rfc", rfcEmisor),
                new XAttribute("Nombre", nombreEmisor),
                new XAttribute("RegimenFiscal", regimenFiscalEmisor)
            ));

            string rfcRec = pago.Client?.RFC ?? "XAXX010101000";
            string cpRec = pago.Client?.CodigoPostal ?? cpEmisor;
            string regimenRec = pago.Client?.RegimenFiscal ?? "616";
            if (rfcRec == "XAXX010101000" || rfcRec == "XEXX010101000") {
                cpRec = cpEmisor;
                regimenRec = "616";
            }

            comprobante.Add(new XElement(cfdi + "Receptor",
                new XAttribute("Rfc", rfcRec),
                new XAttribute("Nombre", pago.Client?.RazonSocial ?? pago.Client?.Name ?? "PUBLICO EN GENERAL"),
                new XAttribute("DomicilioFiscalReceptor", cpRec),
                new XAttribute("RegimenFiscalReceptor", regimenRec),
                new XAttribute("UsoCFDI", "CP01")
            ));

            var conceptos = new XElement(cfdi + "Conceptos");
            conceptos.Add(new XElement(cfdi + "Concepto",
                new XAttribute("ClaveProdServ", "84111506"),
                new XAttribute("Cantidad", "1"),
                new XAttribute("ClaveUnidad", "ACT"),
                new XAttribute("Descripcion", "Pago"),
                new XAttribute("ValorUnitario", "0"),
                new XAttribute("Importe", "0"),
                new XAttribute("ObjetoImp", "01") // No objeto de impuesto
            ));
            comprobante.Add(conceptos);

            // Complemento de Pagos
            var complemento = new XElement(cfdi + "Complemento");
            var pagos = new XElement(pago20 + "Pagos",
                new XAttribute("Version", "2.0"),
                new XElement(pago20 + "Totales",
                    new XAttribute("MontoTotalPagos", pago.Amount.ToString("F2"))
                ),
                new XElement(pago20 + "Pago",
                    new XAttribute("FechaPago", pago.Date.ToString("yyyy-MM-ddTHH:mm:ss")),
                    new XAttribute("FormaDePagoP", "03"), // Transferencia por defecto
                    new XAttribute("MonedaP", "MXN"),
                    new XAttribute("Monto", pago.Amount.ToString("F2")),
                    new XAttribute("TipoCambioP", "1"),
                    new XElement(pago20 + "DoctoRelacionado",
                        new XAttribute("IdDocumento", "00000000-0000-0000-0000-000000000001"),
                        new XAttribute("MonedaDR", "MXN"),
                        new XAttribute("EquivalenciaDR", "1"),
                        new XAttribute("NumParcialidad", "1"),
                        new XAttribute("ImpSaldoAnt", pago.Amount.ToString("F2")),
                        new XAttribute("ImpPagado", pago.Amount.ToString("F2")),
                        new XAttribute("ImpSaldoInsoluto", "0.00"),
                        new XAttribute("ObjetoImpDR", "01")
                    )
                )
            );
            complemento.Add(pagos);
            comprobante.Add(complemento);

            return comprobante.ToString();
        }
    }
}
