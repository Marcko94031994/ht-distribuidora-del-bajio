import React from 'react';
import { pesos } from '../utils/helpers';

export default function Dashboard({ data, sucursal, vendedor, producto }) {
  const pedidos = data.pedidos || [];
  const productos = data.productos || [];
  const sucursales = data.sucursales || [];
  const almacenes = data.almacenes || [];

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Pedidos recientes</h3>
          <span className="chip warn">Tiempo real</span>
        </div>
        <div className="card-b list">
          {pedidos.map(p => (
            <div className="item" key={p.id}>
              <div className="row">
                <b>{p.orderNumber || p.id}</b>
                <span className="chip">{p.status}</span>
              </div>
              <div>{p.cliente}</div>
              <div className="muted">{vendedor(p.driverId)?.name} · {p.hora}</div>
            </div>
          ))}
          {pedidos.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>
              No hay pedidos recientes.
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Resumen operativo</h3>
        </div>
        <div className="card-b">
          <div className="warehouse">
            <div className="wh">
              <span className="muted">Inventario total</span>
              <strong>{productos.reduce((a, b) => a + (b.stock || 0), 0)}</strong>
            </div>
            <div className="wh">
              <span className="muted">Bajo stock</span>
              <strong>{productos.filter(p => (p.stock || 0) <= (p.minStock || 10)).length}</strong>
            </div>
            <div className="wh">
              <span className="muted">Valor aprox.</span>
              <strong>{pesos(productos.reduce((a, b) => a + ((b.stock || 0) * (b.price || 0)), 0))}</strong>
            </div>
          </div>
          <br/>
          <table className="table">
            <thead>
              <tr><th>Producto</th><th>Stock</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td>{pesos((p.stock || 0) * (p.price || 0))}</td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan="3" className="muted" style={{ textAlign: 'center', padding: '15px' }}>
                    No hay productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Sucursales</h3>
        </div>
        <div className="card-b list">
          {sucursales.map(s => (
            <div className="item" key={s.id}>
              <b>{s.name}</b>
              <div className="muted">{s.zone}</div>
              <span className="chip ok">{almacenes.filter(a => a.branchId === s.id).length} almacén(es)</span>
            </div>
          ))}
          {sucursales.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>
              No hay sucursales registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
