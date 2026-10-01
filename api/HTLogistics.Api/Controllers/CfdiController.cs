using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HTLogistics.Api.Data;
using HTLogistics.Api.Models;
using HTLogistics.Api.Services.Finkok;
using HTLogistics.Api.Services;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace HTLogistics.Api.Controllers
{
    [ApiController]
    [Route("api/app/[controller]")]
    [Authorize]
    public class CfdiController : ControllerBase
    {

        private async Task<string> GenerateNextFolio(string documentType, string serie)
        {
            var seq = await _context.DocumentSequences.FirstOrDefaultAsync(s => s.DocumentType == documentType && s.Serie == serie);
            if (seq == null)
            {
                seq = new HTLogistics.Api.Models.DocumentSequence { DocumentType = documentType, Serie = serie, NextFolio = 1 };
                _context.DocumentSequences.Add(seq);
            }
            int folio = seq.NextFolio;
            seq.NextFolio++;
            await _context.SaveChangesAsync();
            return folio.ToString();
        }

        private readonly AppDbContext _context;
        private readonly ICfdiService _cfdiService;
        private readonly IFinkokService _finkokService;
        private readonly HTLogistics.Api.Services.Finkok.FinkokCancelClient _cancelClient;
        private readonly IConfiguration _config;

        public CfdiController(AppDbContext context, ICfdiService cfdiService, IFinkokService finkokService, HTLogistics.Api.Services.Finkok.FinkokCancelClient cancelClient, IConfiguration config)
        {
            _context = context;
            _cfdiService = cfdiService;
            _finkokService = finkokService;
            _cancelClient = cancelClient;
            _config = config;
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingCfdis()
        {
            // Ingresos (Pedidos Entregados)
            var ingresos = await _context.Orders
                .Include(o => o.Client)
                .Where(o => !o.IsFacturado && (o.Status == "Entregado" || o.Status == "Entregado con Devolución") && o.Client != null && !string.IsNullOrEmpty(o.Client.RFC))
                .Select(o => new {
                    Id = o.Id,
                    Type = "Ingreso",
                    Folio = o.OrderNumber,
                    Date = o.Time ?? o.Date.ToString("yyyy-MM-dd"),
                    Amount = o.TotalAmount,
                    ClientId = o.ClientId,
                    ClientName = o.Client!.Name,
                    ClientRfc = o.Client.RFC
                })
                .ToListAsync();

            // Pagos
            var pagos = await _context.ClientPayments
                .Include(p => p.Client)
                .Where(p => !p.IsFacturado && p.Client != null && !string.IsNullOrEmpty(p.Client.RFC))
                .Select(p => new {
                    Id = p.Id,
                    Type = "Pago",
                    Folio = p.Reference ?? $"PAGO-{p.Id}",
                    Date = p.Date.ToString("yyyy-MM-dd"),
                    Amount = p.Amount,
                    ClientId = p.ClientId,
                    ClientName = p.Client!.Name,
                    ClientRfc = p.Client.RFC
                })
                .ToListAsync();

            // Notas de Crédito
            var egresos = await _context.CreditNotes
                .Include(c => c.Client)
                .Where(c => !c.IsFacturado && c.Client != null && !string.IsNullOrEmpty(c.Client.RFC))
                .Select(c => new {
                    Id = c.Id,
                    Type = "Egreso",
                    Folio = $"NC-{c.Id}",
                    Date = c.Date.ToString("yyyy-MM-dd"),
                    Amount = c.Amount,
                    ClientId = c.ClientId,
                    ClientName = c.Client!.Name,
                    ClientRfc = c.Client.RFC,
                    Reason = c.Reason
                })
                .ToListAsync();

            return Ok(new {
                ingresos,
                pagos,
                egresos
            });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var ingresos = await _context.Orders
                .Include(o => o.Client)
                .Where(o => o.IsFacturado)
                .Select(o => new { Id = o.Id, Type = "Ingreso", Folio = o.FolioFactura ?? o.OrderNumber, FolioFiscal = o.FolioFiscal, Date = o.FechaFacturacion, Amount = o.TotalAmount, ClientName = o.Client!.Name })
                .ToListAsync();

            var pagos = await _context.ClientPayments
                .Include(p => p.Client)
                .Where(p => p.IsFacturado)
                .Select(p => new { Id = p.Id, Type = "Pago", Folio = p.FolioFactura ?? p.Reference, FolioFiscal = p.FolioFiscal, Date = p.FechaFacturacion, Amount = p.Amount, ClientName = p.Client!.Name })
                .ToListAsync();

            var egresos = await _context.CreditNotes
                .Include(c => c.Client)
                .Where(c => c.IsFacturado)
                .Select(c => new { Id = c.Id, Type = "Egreso", Folio = c.FolioFactura ?? $"NC-{c.Id}", FolioFiscal = c.FolioFiscal, Date = c.FechaFacturacion, Amount = c.Amount, ClientName = c.Client!.Name })
                .ToListAsync();

            var history = ingresos.Concat(pagos).Concat(egresos).OrderByDescending(x => x.Date).ToList();

            return Ok(history);
        }

        [HttpPost("cancel/{type}/{id}")]
        public async Task<IActionResult> CancelCfdi(string type, int id, [FromQuery] string motivo = "02", [FromQuery] string folioSustitucion = "")
        {
            try
            {
                string uuid = "";
                string rfcEmisor = _config["Cfdi:RfcEmisor"] ?? "GAMH940919IQ0";
                
                if (type == "ingreso")
                {
                    var order = await _context.Orders.FindAsync(id);
                    if (order == null) return NotFound("Pedido no encontrado");
                    if (!order.IsFacturado || string.IsNullOrEmpty(order.FolioFiscal)) return BadRequest("El pedido no está facturado o no tiene Folio Fiscal");
                    
                    uuid = order.FolioFiscal;
                    
                    var cancelResult = await _cancelClient.CancelarAsync(uuid, rfcEmisor, motivo, folioSustitucion);
                    
                    if (cancelResult.Success)
                    {
                        order.IsFacturado = false;
                        order.FolioFiscal = order.FolioFiscal + "_CANCELADO";
                        await _context.SaveChangesAsync();
                        return Ok(new { message = "CFDI cancelado exitosamente en Finkok.", details = cancelResult.Mensaje, acuse = cancelResult.Acuse });
                    }
                    else
                    {
                        return BadRequest(new { message = $"Error cancelando CFDI en Finkok: {cancelResult.Mensaje}" });
                    }
                }
                else if (type == "pago")
                {
                    var pago = await _context.ClientPayments.FindAsync(id);
                    if (pago == null) return NotFound("Pago no encontrado");
                    if (!pago.IsFacturado || string.IsNullOrEmpty(pago.FolioFiscal)) return BadRequest("El pago no está facturado o no tiene Folio Fiscal");
                    
                    uuid = pago.FolioFiscal;
                    
                    var cancelResult = await _cancelClient.CancelarAsync(uuid, rfcEmisor, motivo, folioSustitucion);
                    
                    if (cancelResult.Success)
                    {
                        pago.IsFacturado = false;
                        pago.FolioFiscal = pago.FolioFiscal + "_CANCELADO";
                        await _context.SaveChangesAsync();
                        return Ok(new { message = "CFDI de Pago cancelado exitosamente en Finkok.", details = cancelResult.Mensaje, acuse = cancelResult.Acuse });
                    }
                    else
                    {
                        return BadRequest(new { message = $"Error cancelando CFDI de Pago en Finkok: {cancelResult.Mensaje}" });
                    }
                }
                
                return BadRequest("Tipo no soportado");
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("stamp/{type}/{id}")]
        public async Task<IActionResult> StampCfdi(string type, int id)
        {
            // type: ingreso | pago | egreso
            string xmlBase = "";
            
            try
            {
                if (type == "ingreso")
                {
                    var order = await _context.Orders.Include(o => o.Items).ThenInclude(i => i.Product).Include(o => o.Client).FirstOrDefaultAsync(o => o.Id == id);
                    if (order == null) return NotFound("Pedido no encontrado");
                    if (order.IsFacturado) return BadRequest("El pedido ya está facturado");

                    string folio = await GenerateNextFolio("Ingreso", "A");
                    xmlBase = await _cfdiService.GenerarIngresoAsync(order, folio);
                    order.FolioFactura = $"A-{folio}";
                }
                else if (type == "pago")
                {
                    var pago = await _context.ClientPayments.Include(p => p.Client).FirstOrDefaultAsync(p => p.Id == id);
                    if (pago == null) return NotFound("Pago no encontrado");
                    if (pago.IsFacturado) return BadRequest("El pago ya está facturado");

                    string folio = await GenerateNextFolio("Pago", "P");
                    xmlBase = await _cfdiService.GenerarComplementoPagoAsync(pago, folio);
                    pago.FolioFactura = $"P-{folio}";
                }
                else if (type == "egreso")
                {
                    var nc = await _context.CreditNotes.Include(c => c.Client).FirstOrDefaultAsync(c => c.Id == id);
                    if (nc == null) return NotFound("Nota de crédito no encontrada");
                    if (nc.IsFacturado) return BadRequest("La nota de crédito ya está facturada");

                    string folio = await GenerateNextFolio("Egreso", "NC");
                    xmlBase = await _cfdiService.GenerarEgresoAsync(nc, folio);
                    nc.FolioFactura = $"NC-{folio}";
                }
                else
                {
                    return BadRequest("Tipo de CFDI no soportado");
                }

                // Cargar llave desde appsettings
                var config = HttpContext.RequestServices.GetService(typeof(Microsoft.Extensions.Configuration.IConfiguration)) as Microsoft.Extensions.Configuration.IConfiguration;
                var keyPath = config?["FinkokSettings:KeyPath"] ?? "";
                var password = config?["FinkokSettings:KeyPassword"] ?? "";

                if (string.IsNullOrEmpty(keyPath) || string.IsNullOrEmpty(password))
                    return BadRequest("Faltan rutas de CSD en la configuración.");

                // Sellar localmente
                string xmlSellado = _cfdiService.SellarXml(xmlBase, keyPath, password);

                // Timbrar con Finkok
                var result = await _finkokService.TimbrarAsync(xmlSellado);

                // --- GUARDAR XML REQUEST Y RESPONSE (SIEMPRE, INCLUSO CON ERROR) ---
                string cfdiFolder = Path.Combine(Directory.GetCurrentDirectory(), "CFDI_Archivos");
                if (!Directory.Exists(cfdiFolder)) Directory.CreateDirectory(cfdiFolder);
                
                string fileId = result.Success && !string.IsNullOrEmpty(result.UUID) ? result.UUID : $"ERROR_{DateTime.Now.Ticks}";
                string baseFileName = $"{type}_{id}_{fileId}";
                string requestPath = Path.Combine(cfdiFolder, $"{baseFileName}_request.xml");
                string responsePath = Path.Combine(cfdiFolder, $"{baseFileName}_response.xml");
                
                System.IO.File.WriteAllText(requestPath, xmlSellado);
                System.IO.File.WriteAllText(responsePath, result.XmlTimbrado ?? result.ErrorMessage ?? "Error desconocido");
                // -------------------------------------------------------------------

                if (!result.Success)
                {
                    return BadRequest(result.ErrorMessage);
                }

                // Actualizar DB
                var now = DateTime.Now;
                if (type == "ingreso")
                {
                    var order = await _context.Orders.FindAsync(id);
                    order!.IsFacturado = true;
                    order.FolioFiscal = result.UUID;
                    order.FechaFacturacion = now;
                }
                else if (type == "pago")
                {
                    var pago = await _context.ClientPayments.FindAsync(id);
                    pago!.IsFacturado = true;
                    pago.FolioFiscal = result.UUID;
                    pago.FechaFacturacion = now;
                }
                else if (type == "egreso")
                {
                    var nc = await _context.CreditNotes.FindAsync(id);
                    nc!.IsFacturado = true;
                    nc.FolioFiscal = result.UUID;
                    nc.FechaFacturacion = now;
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, uuid = result.UUID, xml = result.XmlTimbrado });
            }
            catch (Exception ex)
            {
                Console.WriteLine("StampCfdi ERROR: " + ex.ToString());
                return StatusCode(500, ex.Message);
            }
        }
    
        [HttpGet("pdf/{type}/{id}")]
        public async Task<IActionResult> DownloadPdf(string type, int id)
        {
            try
            {
                string cfdiFolder = Path.Combine(Directory.GetCurrentDirectory(), "CFDI_Archivos");
                string uuid = "";
                HTLogistics.Api.Models.Order orderContext = null;

                if (type == "ingreso")
                {
                    var order = await _context.Orders.Include(o => o.Client).FirstOrDefaultAsync(o => o.Id == id);
                    if (order == null || string.IsNullOrEmpty(order.FolioFiscal)) return NotFound("Orden no encontrada o no facturada.");
                    uuid = order.FolioFiscal;
                    orderContext = order;
                }
                else if (type == "pago")
                {
                    var pago = await _context.ClientPayments.Include(p => p.Client).FirstOrDefaultAsync(p => p.Id == id);
                    if (pago == null || string.IsNullOrEmpty(pago.FolioFiscal)) return NotFound("Pago no encontrado o no facturado.");
                    uuid = pago.FolioFiscal;
                }
                else if (type == "egreso")
                {
                    var nc = await _context.CreditNotes.Include(n => n.Client).FirstOrDefaultAsync(n => n.Id == id);
                    if (nc == null || string.IsNullOrEmpty(nc.FolioFiscal)) return NotFound("Nota de crédito no encontrada o no facturada.");
                    uuid = nc.FolioFiscal;
                }
                else
                {
                    return BadRequest("Tipo inválido.");
                }

                string baseFileName = $"{type}_{id}_{uuid}";
                string responsePath = Path.Combine(cfdiFolder, $"{baseFileName}_response.xml");

                if (!System.IO.File.Exists(responsePath))
                {
                    return NotFound("El archivo XML de la factura no existe en el servidor.");
                }

                string xmlContent = await System.IO.File.ReadAllTextAsync(responsePath);
                
                // Generar PDF
                byte[] pdfBytes = HTLogistics.Api.Services.PdfInvoiceGenerator.GenerateInvoicePdf(xmlContent, orderContext);
                
                return File(pdfBytes, "application/pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("xml/{type}/{id}")]
        public async Task<IActionResult> DownloadXml(string type, int id)
        {
            try
            {
                string cfdiFolder = Path.Combine(Directory.GetCurrentDirectory(), "CFDI_Archivos");
                string uuid = "";
                if (type == "ingreso")
                {
                    var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);
                    if (order == null || string.IsNullOrEmpty(order.FolioFiscal)) return NotFound("Orden no facturada.");
                    uuid = order.FolioFiscal;
                }
                else if (type == "pago")
                {
                    var pago = await _context.ClientPayments.FirstOrDefaultAsync(p => p.Id == id);
                    if (pago == null || string.IsNullOrEmpty(pago.FolioFiscal)) return NotFound("Pago no facturado.");
                    uuid = pago.FolioFiscal;
                }
                else if (type == "egreso")
                {
                    var nc = await _context.CreditNotes.FirstOrDefaultAsync(n => n.Id == id);
                    if (nc == null || string.IsNullOrEmpty(nc.FolioFiscal)) return NotFound("NC no facturada.");
                    uuid = nc.FolioFiscal;
                }

                string baseFileName = $"{type}_{id}_{uuid}";
                string responsePath = Path.Combine(cfdiFolder, $"{baseFileName}_response.xml");

                if (!System.IO.File.Exists(responsePath)) return NotFound("Archivo XML no encontrado.");

                byte[] xmlBytes = await System.IO.File.ReadAllBytesAsync(responsePath);
                return File(xmlBytes, "application/xml", $"{baseFileName}.xml");
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
}
}
