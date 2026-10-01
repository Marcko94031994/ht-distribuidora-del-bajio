import { useEffect } from 'react';
import { pesos } from '../utils/helpers';

export default function FormatoOC({ po, productos, proveedores, almacenes, onClose }) {
  useEffect(() => {
    // Attempt to open print dialog automatically
    // Using setTimeout to ensure styles and images have a moment to load
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const provider = proveedores?.find(p => p.id === po.providerId);
  const warehouse = almacenes?.find(w => w.id === po.details?.[0]?.warehouseId);
  
  // Totals calculations
  let subTotal = 0;
  let totalIva = 0;
  
  const detalles = (po.details || []).map(d => {
    const p = productos?.find(x => x.id === d.productId);
    const cant = d.orderedQuantity > 0 ? d.orderedQuantity : d.quantity;
    const price = d.orderedUnitCost > 0 ? d.orderedUnitCost : d.unitCost;
    const sub = cant * price;
    const iva = sub * (d.ivaRate || 0);
    
    subTotal += sub;
    totalIva += iva;
    
    return {
      ...d,
      cant,
      price,
      sub,
      iva,
      sku: p?.sku || '',
      desc: p?.name || 'Producto #' + d.productId,
      brand: p?.brand?.name || '',
    };
  });

  const total = subTotal + totalIva;

  return (
    <div className="printable-oc-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: '#52525b', zIndex: 99999, overflowY: 'auto',
      padding: '40px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-oc-overlay { 
            position: absolute; left: 0; top: 0; background-color: white !important; 
            padding: 0 !important; width: 100%; height: 100%; overflow: visible !important;
          }
          .printable-oc-overlay * { visibility: visible; }
          .hide-on-print { display: none !important; }
          .page-content {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
        }
        .page-content {
          background: white;
          width: 21cm; /* A4 width */
          min-height: 29.7cm; /* A4 height */
          padding: 1.5cm;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          color: #000;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 11px;
        }
        .oc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .oc-header-center {
          text-align: center;
          flex: 1;
        }
        .oc-title {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 4px;
        }
        .oc-info-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .oc-info-box {
          border: 1px solid #000;
          padding: 10px;
          border-radius: 4px;
        }
        .oc-info-box p {
          margin: 3px 0;
          display: flex;
        }
        .oc-info-box p strong {
          width: 120px;
          display: inline-block;
        }
        .oc-info-box-right p strong {
          width: 80px;
        }
        .oc-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10px;
        }
        .oc-table th, .oc-table td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        .oc-table th {
          background-color: #f3f4f6;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .oc-table td.text-right { text-align: right; }
        .oc-totals-container {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
        }
        .oc-signatures {
          display: flex;
          gap: 30px;
          flex: 1;
          margin-top: 40px;
        }
        .oc-signature-box {
          flex: 1;
          text-align: center;
        }
        .oc-signature-line {
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
          height: 40px;
        }
        .oc-totals {
          width: 250px;
        }
        .oc-totals table {
          width: 100%;
          border-collapse: collapse;
        }
        .oc-totals table td {
          padding: 4px;
          border: 1px solid #000;
        }
        .oc-totals table td.label {
          text-align: right;
          background-color: #f3f4f6;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .oc-totals table td.amount {
          text-align: right;
          font-weight: bold;
        }
        .oc-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          font-size: 9px;
          color: #555;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
      `}</style>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }} className="hide-on-print">
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
        <button className="btn secondary" onClick={onClose}>
          ✕ Cerrar
        </button>
      </div>

      <div className="page-content">
        <div className="oc-header">
          <div>
            <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
          </div>
          <div className="oc-header-center">
            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>HT DISTRIBUIDORA DEL BAJIO</h2>
            <p style={{ margin: 0 }}>TRES MARIAS 159</p>
            <p style={{ margin: 0 }}>GUA, MEX CP: 37370</p>
          </div>
          <div>
            <div className="oc-title">C O M P R A</div>
          </div>
        </div>

        <div className="oc-info-grid">
          <div className="oc-info-box">
            <p><strong>Factura Número:</strong> <span>{po.reference1 || ''}</span></p>
            <p><strong>Remisión Número:</strong> <span>{po.reference2 || ''}</span></p>
            <p><strong>Proveedor:</strong> <span>{provider?.name || 'N/A'}</span></p>
            <p><strong>Observaciones:</strong> <span>{po.notes || po.receptionNotes || ''}</span></p>
            <p><strong>UUID:</strong> <span></span></p>
            <p><strong>Emisor Rfc:</strong> <span>{provider?.rfc || ''}</span></p>
            <p><strong>Receptor Rfc:</strong> <span>HETM020122RY0</span></p>
          </div>
          <div className="oc-info-box oc-info-box-right">
            <p><strong>Compra:</strong> <span>{po.poNumber}</span></p>
            <p><strong>Fecha:</strong> <span>{new Date(po.date).toLocaleDateString()}</span></p>
            <p><strong>Status:</strong> <span>{po.status === 'Autorizada' || po.status === 'Recibida' ? 'POR PAGAR' : po.status.toUpperCase()}</span></p>
            <p><strong>Tipo:</strong> <span>PROVEEDOR</span></p>
            <p><strong>Movimiento:</strong> <span>{warehouse?.name || 'ALMACEN'} BODEGA</span></p>
          </div>
        </div>

        <table className="oc-table">
          <thead>
            <tr>
              <th>Cantidad</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Marca</th>
              <th>Ubicación</th>
              <th className="text-right">Precio</th>
              <th className="text-right">Dcto %</th>
              <th className="text-right">SubTotal</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((d, i) => (
              <tr key={i}>
                <td>{d.cant}</td>
                <td>{d.sku || d.productId}</td>
                <td>{d.desc}</td>
                <td>{d.brand || 'ABARROTES EN GEN'}</td>
                <td>{d.location || ''}</td>
                <td className="text-right">{pesos(d.price)}</td>
                <td className="text-right">0.00</td>
                <td className="text-right">{pesos(d.sub)}</td>
              </tr>
            ))}
            {detalles.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: 'center' }}>No hay detalles</td></tr>
            )}
          </tbody>
        </table>

        <div className="oc-totals-container">
          <div className="oc-signatures">
            <div className="oc-signature-box">
              <div className="oc-signature-line"></div>
              <div>Capturó Movimiento</div>
              <div style={{ marginTop: '5px', fontWeight: 'bold' }}>SISTEMA</div>
            </div>
            <div className="oc-signature-box">
              <div className="oc-signature-line"></div>
              <div>Recibió Mercancia</div>
              <div style={{ marginTop: '5px' }}></div>
            </div>
          </div>

          <div className="oc-totals">
            <table>
              <tbody>
                <tr>
                  <td className="label">Descuento $</td>
                  <td className="amount">0.00</td>
                </tr>
                <tr>
                  <td className="label">SubTotal $</td>
                  <td className="amount">{pesos(subTotal)}</td>
                </tr>
                <tr>
                  <td className="label">IVA $</td>
                  <td className="amount">{pesos(totalIva)}</td>
                </tr>
                <tr>
                  <td className="label">Retención $</td>
                  <td className="amount">0.00</td>
                </tr>
                <tr>
                  <td className="label">Total $</td>
                  <td className="amount">{pesos(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="oc-footer">
          <div>{po.receivedBy || po.createdBy || 'ADMINISTRACIÓN'}</div>
          <div>Página 1 de 1</div>
          <div>{new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
