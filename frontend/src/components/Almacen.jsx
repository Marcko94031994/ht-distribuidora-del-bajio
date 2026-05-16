import React from 'react';
import { pesos } from '../utils/helpers';

export default function Almacen({data,sucursal,almacen,producto,proveedor,addOC,aplicarCompra,devoluciones,autorizarDevolucion}){
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Nueva Orden de Compra</h3>
        </div>
        <div className="card-b">
          <form onSubmit={addOC} className="form-grid">
            <select name="providerId" className="select full" required>
              <option value="">Seleccionar Proveedor</option>
              {data.proveedores?.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
            </select>
            <select name="productoId" className="select full" required>
              <option value="">Seleccionar Producto</option>
              {data.productos.map(p=><option value={p.id} key={p.id}>{p.name} (Almacén {almacen(p.warehouseId)?.name})</option>)}
            </select>
            <input name="cantidad" type="number" className="input" placeholder="Cant. de piezas" required />
            <input name="costo" type="number" step="0.01" className="input" placeholder="Costo Unitario" required />
            <input name="lote" type="text" className="input" placeholder="Lote / Serie" />
            <input name="caducidad" type="date" className="input" placeholder="Fecha Caducidad" />
            <button type="submit" className="btn success full">Generar Borrador</button>
          </form>
        </div>
      </div>
      <div className="card double">
        <div className="card-h">
          <h3>Control de Órdenes de Compra</h3>
        </div>
        <div className="card-b">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Proveedor</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Costo Unit.</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.compras.map(oc=>{
                  const p=producto(oc.productId);
                  const prov=proveedor(oc.providerId);
                  return (
                    <tr key={oc.id}>
                      <td><b>{oc.poNumber}</b></td>
                      <td>{prov?.name || 'Desconocido'}</td>
                      <td>{p?.name}</td>
                      <td>{oc.quantity}</td>
                      <td>{pesos(oc.cost)}</td>
                      <td>{pesos(oc.cost*oc.quantity)}</td>
                      <td><span className={'chip '+(oc.status==='Borrador'?'warn':'ok')}>{oc.status}</span></td>
                      <td>
                        {oc.status==='Borrador' && <button className="btn primary" onClick={()=>aplicarCompra(oc)}>Aplicar / Recibir</button>}
                        {oc.status!=='Borrador' && <span className="muted">Completado</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                    <td><b>{data.pedidos.find(p => p.id === d.orderId)?.orderNumber}</b></td>
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
