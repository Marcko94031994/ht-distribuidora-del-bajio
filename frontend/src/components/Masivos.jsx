import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Masivos({ data, reloadState }) {
  const [updates, setUpdates] = useState({});

  const handleChange = (id, field, value) => {
    setUpdates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        [field]: field === 'stock' ? parseInt(value) : parseFloat(value)
      }
    }));
  };

  const handleSave = async () => {
    const payload = Object.values(updates);
    if (payload.length === 0) return;

    const token = localStorage.getItem('ht_token');
    const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/products/bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Actualización masiva completada con éxito.');
      setUpdates({});
      reloadState();
    }
  };

  return (
    <div className="grid full">
      <div className="card">
        <div className="card-h">
          <h3>Edición Masiva de Precios y Existencias</h3>
          <button className="btn success" onClick={handleSave} disabled={Object.keys(updates).length === 0}>
            Guardar Cambios ({Object.keys(updates).length})
          </button>
        </div>
        <div className="card-b">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Costo Actual</th>
                <th>Nuevo Costo</th>
                <th>Precio Venta</th>
                <th>Nuevo Precio</th>
                <th>Stock Actual</th>
                <th>Nuevo Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.productos.map(p => (
                <tr key={p.id}>
                  <td><small>{p.sku}</small></td>
                  <td><b>{p.name}</b></td>
                  <td>{pesos(p.cost)}</td>
                  <td>
                    <input type="number" step="0.01" className="input" style={{ width: '100px' }} 
                      placeholder={p.cost}
                      onChange={(e) => handleChange(p.id, 'cost', e.target.value)} />
                  </td>
                  <td>{pesos(p.price)}</td>
                  <td>
                    <input type="number" step="0.01" className="input" style={{ width: '100px' }} 
                      placeholder={p.price}
                      onChange={(e) => handleChange(p.id, 'price', e.target.value)} />
                  </td>
                  <td><span className={`chip ${p.stock <= 10 ? 'warn' : 'ok'}`}>{p.stock}</span></td>
                  <td>
                    <input type="number" className="input" style={{ width: '80px' }} 
                      placeholder={p.stock}
                      onChange={(e) => handleChange(p.id, 'stock', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
