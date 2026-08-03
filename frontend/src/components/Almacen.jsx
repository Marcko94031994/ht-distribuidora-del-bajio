import React, { useState } from 'react';
import { pesos } from '../utils/helpers';
import InventarioGrid from './InventarioGrid';
import SearchableSelect from './SearchableSelect';

export default function Almacen({data,sucursal,almacen,producto,proveedor,addOC,aplicarCompra,devoluciones,autorizarDevolucion,registrarAjuste}){
  const [selectedProductId, setSelectedProductId] = useState('');

  return (
    <div className="grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <InventarioGrid data={data} />
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Salida de Mermas / Muestras</h3>
        </div>
        <div className="card-b">
          <form onSubmit={registrarAjuste} className="form-grid">
            <div className="full">
              <SearchableSelect
                name="productId"
                options={data.productos || []}
                value={selectedProductId}
                onChange={(val) => setSelectedProductId(val)}
                placeholder="🔍 Escribe o selecciona un Producto..."
                getOptionLabel={(p) => p.name}
                getOptionValue={(p) => p.id}
                getOptionSubtext={(p) => `Disp: ${p.availableStock !== undefined ? p.availableStock : p.stock} ${p.sku ? `· SKU: ${p.sku}` : ''}`}
                required
              />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              <select name="adjustmentType" className="select" required>
                <option value="">Motivo...</option>
                <option value="Merma">Merma (Daño/Caducidad)</option>
                <option value="Muestra">Muestra (Promoción)</option>
              </select>
              <input name="quantity" type="number" min="1" className="input" placeholder="Cantidad" required />
            </div>
            <textarea name="reason" className="input full" placeholder="Justificación detallada..." required></textarea>
            <button type="submit" className="btn warn full">Registrar Salida</button>
          </form>
        </div>
      </div>

      <div className="card double" style={{gridColumn: '1 / -1'}}>
        <div className="card-h">
          <h3 className="danger">Devoluciones por Autorizar (Bandeja de Cuarentena)</h3>
        </div>
        <div className="card-b">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Razón</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones?.filter(d => d.status === 'Pendiente').map(d => (
                  <tr key={d.id}>
                    <td><b>{(data.pedidos || []).find(p => p.id === d.orderId)?.orderNumber || `Folio #${d.orderId}`}</b></td>
                    <td>{producto(d.productId)?.name}</td>
                    <td>{d.quantity}</td>
                    <td>{d.reason}</td>
                    <td><span className="chip warn">{d.status}</span></td>
                    <td style={{display: 'flex', gap: '0.5rem'}}>
                      <button className="btn success" onClick={() => autorizarDevolucion(d.id, false)}>Reingresar a Stock</button>
                      <button className="btn danger" onClick={() => autorizarDevolucion(d.id, true)}>Mandar a Merma</button>
                    </td>
                  </tr>
                ))}
                {devoluciones?.filter(d => d.status === 'Pendiente').length === 0 && (
                  <tr><td colSpan="6" className="muted" style={{textAlign: 'center'}}>No hay devoluciones pendientes de revisión.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

