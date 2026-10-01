using System;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QRCoder;
using System.Globalization;

namespace HTLogistics.Api.Services
{
    public class PdfInvoiceGenerator
    {
        public static byte[] GenerateInvoicePdf(string xmlContent, HTLogistics.Api.Models.Order order)
        {
            var xdoc = XDocument.Parse(xmlContent);
            XNamespace cfdi = "http://www.sat.gob.mx/cfd/4";
            XNamespace tfd = "http://www.sat.gob.mx/TimbreFiscalDigital";
            XNamespace pago20 = "http://www.sat.gob.mx/Pagos20";
            
            var comprobante = xdoc.Element(cfdi + "Comprobante");
            var emisor = comprobante.Element(cfdi + "Emisor");
            var receptor = comprobante.Element(cfdi + "Receptor");
            var conceptos = comprobante.Element(cfdi + "Conceptos")?.Elements(cfdi + "Concepto");
            var complemento = comprobante.Element(cfdi + "Complemento");
            var timbre = complemento?.Element(tfd + "TimbreFiscalDigital");
            var pagos = complemento?.Element(pago20 + "Pagos")?.Elements(pago20 + "Pago");
            
            string tipoDeComprobante = comprobante.Attribute("TipoDeComprobante")?.Value ?? "I";

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.Letter);
                    page.Margin(30);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(8).FontFamily(Fonts.Lato));
                    
                    page.Header().Element(c => ComposeHeader(c, comprobante, emisor, receptor, tipoDeComprobante));
                    
                    page.Content().Element(c => {
                        if (tipoDeComprobante == "P" && pagos != null && pagos.Any())
                        {
                            ComposePagosContent(c, pagos, pago20);
                        }
                        else
                        {
                            ComposeContent(c, conceptos);
                        }
                    });

                    page.Footer().Element(c => ComposeFooter(c, comprobante, emisor, receptor, timbre, pagos, tipoDeComprobante));
                });
            });

            return document.GeneratePdf();
        }

        private static void ComposeHeader(IContainer container, XElement comprobante, XElement emisor, XElement receptor, string tipoDeComprobante)
        {
            string tipoStr = tipoDeComprobante == "I" ? "Comprobante de Ingreso" : (tipoDeComprobante == "E" ? "Nota de Crédito (Egreso)" : "Complemento de Pago");

            container.Column(col => 
            {
                col.Item().Row(row => 
                {
                    string logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "logo.png");
                    if (File.Exists(logoPath)) {
                        row.ConstantItem(120).Height(60).Image(logoPath);
                    } else {
                        row.ConstantItem(120).Height(60).Placeholder(); 
                    }
                    
                    row.RelativeItem().PaddingLeft(10).Column(c => {
                        c.Item().Text(emisor.Attribute("Nombre")?.Value ?? "HT DISTRIBUIDORA").Bold().FontSize(14).AlignCenter();
                        c.Item().Text(emisor.Attribute("Rfc")?.Value).Bold().FontSize(10).AlignCenter();
                        c.Item().Text($"Régimen Fiscal: {emisor.Attribute("RegimenFiscal")?.Value}").AlignCenter();
                        c.Item().Text($"C.P. de Expedición: {comprobante.Attribute("LugarExpedicion")?.Value}").AlignCenter();
                    });

                    row.ConstantItem(150).Background(Colors.Grey.Lighten4).Padding(5).Column(c => {
                        c.Item().Text(tipoStr).Bold().FontSize(10).AlignCenter();
                        c.Item().Background(Colors.Red.Darken4).Padding(2).Text(tipoDeComprobante == "P" ? "PAGO" : "FACTURA").FontColor(Colors.White).Bold().AlignCenter();
                        c.Item().Text($"{comprobante.Attribute("Serie")?.Value}-{comprobante.Attribute("Folio")?.Value}").Bold().FontSize(12).AlignCenter();
                    });
                });

                col.Item().PaddingTop(10).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Column(c => {
                    c.Item().Text("Datos del Cliente (Receptor)").Bold().FontSize(10).FontColor(Colors.Red.Darken4);
                    c.Item().PaddingBottom(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                    
                    c.Item().Row(r => {
                        r.RelativeItem().Text($"Nombre: {receptor.Attribute("Nombre")?.Value}");
                        r.RelativeItem().Text($"RFC: {receptor.Attribute("Rfc")?.Value}");
                        r.RelativeItem().Text($"Uso CFDI: {receptor.Attribute("UsoCFDI")?.Value}");
                    });
                    c.Item().Row(r => {
                        r.RelativeItem().Text($"Dirección: C.P. {receptor.Attribute("DomicilioFiscalReceptor")?.Value}");
                        r.RelativeItem().Text($"Régimen Fiscal: {receptor.Attribute("RegimenFiscalReceptor")?.Value}");
                        r.RelativeItem().Text($"Emitida: {comprobante.Attribute("Fecha")?.Value}");
                    });
                    
                    if (tipoDeComprobante != "P") {
                        c.Item().PaddingTop(5).Row(r => {
                            r.RelativeItem().Text($"Forma de Pago: {comprobante.Attribute("FormaPago")?.Value}");
                            r.RelativeItem().Text($"Método de Pago: {comprobante.Attribute("MetodoPago")?.Value}");
                            r.RelativeItem().Text($"Moneda: {comprobante.Attribute("Moneda")?.Value}");
                        });
                    } else {
                        c.Item().PaddingTop(5).Row(r => {
                            r.RelativeItem().Text($"Moneda: {comprobante.Attribute("Moneda")?.Value}");
                        });
                    }
                });
            });
        }

        private static void ComposeContent(IContainer container, System.Collections.Generic.IEnumerable<XElement> conceptos)
        {
            container.PaddingVertical(10).Table(table => 
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(50);
                    columns.ConstantColumn(70);
                    columns.RelativeColumn();
                    columns.ConstantColumn(60);
                    columns.ConstantColumn(60);
                });

                table.Header(header =>
                {
                    header.Cell().PaddingBottom(5).BorderBottom(1).Text("Cantidad");
                    header.Cell().PaddingBottom(5).BorderBottom(1).Text("Código");
                    header.Cell().PaddingBottom(5).BorderBottom(1).Text("Descripción");
                    header.Cell().PaddingBottom(5).BorderBottom(1).AlignRight().Text("Precio");
                    header.Cell().PaddingBottom(5).BorderBottom(1).AlignRight().Text("Importe");
                });

                if (conceptos != null)
                {
                    foreach (var concepto in conceptos)
                    {
                        table.Cell().PaddingTop(5).Text(concepto.Attribute("Cantidad")?.Value);
                        table.Cell().PaddingTop(5).Text(concepto.Attribute("NoIdentificacion")?.Value ?? concepto.Attribute("ClaveProdServ")?.Value);
                        table.Cell().PaddingTop(5).Text(concepto.Attribute("Descripcion")?.Value);
                        table.Cell().PaddingTop(5).AlignRight().Text(concepto.Attribute("ValorUnitario")?.Value);
                        table.Cell().PaddingTop(5).AlignRight().Text(concepto.Attribute("Importe")?.Value);
                    }
                }
            });
        }

        private static void ComposePagosContent(IContainer container, System.Collections.Generic.IEnumerable<XElement> pagos, XNamespace pago20)
        {
            container.PaddingVertical(10).Column(c => {
                c.Item().Text("Información de Pagos").Bold().FontSize(10);
                
                c.Item().Table(table => 
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                        columns.ConstantColumn(80);
                    });

                    table.Header(header =>
                    {
                        header.Cell().BorderBottom(1).Text("Fecha Pago");
                        header.Cell().BorderBottom(1).Text("Forma Pago");
                        header.Cell().BorderBottom(1).Text("Moneda");
                        header.Cell().BorderBottom(1).Text("Operación");
                        header.Cell().BorderBottom(1).AlignRight().Text("Monto");
                    });

                    foreach (var pago in pagos)
                    {
                        table.Cell().Text(pago.Attribute("FechaPago")?.Value);
                        table.Cell().Text(pago.Attribute("FormaDePagoP")?.Value);
                        table.Cell().Text(pago.Attribute("MonedaP")?.Value);
                        table.Cell().Text(pago.Attribute("NumOperacion")?.Value ?? "-");
                        table.Cell().AlignRight().Text(pago.Attribute("Monto")?.Value).Bold();

                        var doctos = pago.Elements(pago20 + "DoctoRelacionado");
                        if (doctos.Any())
                        {
                            table.Cell().ColumnSpan(5).PaddingLeft(20).PaddingTop(5).PaddingBottom(10).Table(docTable => {
                                docTable.ColumnsDefinition(dc => {
                                    dc.RelativeColumn(2);
                                    dc.RelativeColumn();
                                    dc.RelativeColumn();
                                    dc.RelativeColumn();
                                });
                                docTable.Header(dh => {
                                    dh.Cell().BorderBottom(1).Text("Documento Relacionado (UUID)").FontColor(Colors.Grey.Medium);
                                    dh.Cell().BorderBottom(1).Text("Saldo Ant").FontColor(Colors.Grey.Medium);
                                    dh.Cell().BorderBottom(1).Text("Pagado").FontColor(Colors.Grey.Medium);
                                    dh.Cell().BorderBottom(1).Text("Saldo Insoluto").FontColor(Colors.Grey.Medium);
                                });
                                foreach (var doc in doctos) {
                                    docTable.Cell().Text(doc.Attribute("IdDocumento")?.Value).FontColor(Colors.Grey.Darken2);
                                    docTable.Cell().Text(doc.Attribute("ImpSaldoAnt")?.Value).FontColor(Colors.Grey.Darken2);
                                    docTable.Cell().Text(doc.Attribute("ImpPagado")?.Value).FontColor(Colors.Grey.Darken2);
                                    docTable.Cell().Text(doc.Attribute("ImpSaldoInsoluto")?.Value).FontColor(Colors.Grey.Darken2);
                                }
                            });
                        }
                    }
                });
            });
        }

        private static void ComposeFooter(IContainer container, XElement comprobante, XElement emisor, XElement receptor, XElement timbre, System.Collections.Generic.IEnumerable<XElement> pagos, string tipoDeComprobante)
        {
            string total = "0.00";
            if (tipoDeComprobante == "P")
            {
                if (pagos != null && pagos.Any())
                {
                    decimal sumaPagos = 0;
                    foreach(var p in pagos) {
                        if (decimal.TryParse(p.Attribute("Monto")?.Value, out decimal monto)) sumaPagos += monto;
                    }
                    total = sumaPagos.ToString("F2");
                }
            }
            else
            {
                total = comprobante.Attribute("Total")?.Value ?? "0.00";
            }
            
            var uuid = timbre?.Attribute("UUID")?.Value ?? "";
            var selloCFD = timbre?.Attribute("SelloCFD")?.Value ?? "N/A";
            var selloSAT = timbre?.Attribute("SelloSAT")?.Value ?? "N/A";
            var fechaTimbrado = timbre?.Attribute("FechaTimbrado")?.Value ?? "N/A";
            var rfcEmisor = emisor?.Attribute("Rfc")?.Value ?? "";
            var rfcReceptor = receptor?.Attribute("Rfc")?.Value ?? "";

            string sfe = selloCFD.Length > 8 ? selloCFD.Substring(selloCFD.Length - 8) : selloCFD;
            string qrUrl = $"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={uuid}&re={rfcEmisor}&rr={rfcReceptor}&tt={total}&fe={sfe}";
            
            byte[] qrBytes = new byte[0];
            try {
                using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
                using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrUrl, QRCodeGenerator.ECCLevel.Q))
                using (PngByteQRCode qrCode = new PngByteQRCode(qrCodeData))
                {
                    qrBytes = qrCode.GetGraphic(20);
                }
            } catch { }

            container.Column(c => {
                c.Item().Row(r => {
                    r.RelativeItem().AlignRight().Column(colTotals => {
                        if (tipoDeComprobante != "P") {
                            string subtotal = comprobante.Attribute("SubTotal")?.Value ?? "0.00";
                            colTotals.Item().Text($"SubTotal: ${subtotal}").AlignRight().FontSize(10);
                            
                            var cfdiNamespace = comprobante.Name.Namespace;
                            var impuestos = comprobante.Element(cfdiNamespace + "Impuestos");
                            if (impuestos != null) {
                                string totalTrasladados = impuestos.Attribute("TotalImpuestosTrasladados")?.Value ?? "0.00";
                                colTotals.Item().Text($"Impuestos Trasladados (IVA): ${totalTrasladados}").AlignRight().FontSize(10);
                                
                                string totalRetenidos = impuestos.Attribute("TotalImpuestosRetenidos")?.Value ?? "0.00";
                                if (totalRetenidos != "0.00" && !string.IsNullOrEmpty(totalRetenidos)) {
                                    colTotals.Item().Text($"Impuestos Retenidos: ${totalRetenidos}").AlignRight().FontSize(10);
                                }
                            }
                        }
                        colTotals.Item().Text($"Total: ${total}").AlignRight().Bold().FontSize(12);
                    });
                });
                
                c.Item().PaddingTop(10).Row(r => {
                    r.ConstantItem(100).Height(100).Image(qrBytes);
                    r.RelativeItem().PaddingLeft(10).Column(col => {
                        col.Item().Text($"UUID: {uuid}  Fecha Timbrado: {fechaTimbrado}").Bold();
                        col.Item().Text("Sello digital CFDi:").Bold();
                        col.Item().Text(selloCFD).FontSize(6);
                        col.Item().Text("Sello digital SAT:").Bold();
                        col.Item().Text(selloSAT).FontSize(6);
                        col.Item().Text("Cadena Original del Complemento de Certificación Digital del SAT:").Bold();
                        col.Item().Text($"||1.1|{uuid}|{fechaTimbrado}|{selloCFD}||").FontSize(6);
                    });
                });
            });
        }
    }
}
