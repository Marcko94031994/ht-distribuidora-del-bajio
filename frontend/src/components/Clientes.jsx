import React, { useState } from 'react';

export default function Clientes({ data, addCliente, updateCliente, ruta }) {
  const [editing, setEditing] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      zone: f.get('zone'),
      latitude: Number(f.get('latitude')),
      longitude: Number(f.get('longitude')),
      routeId: Number(f.get('routeId'))
    };

    if (editing) {
      updateCliente(editing.id, payload);
      setEditing(null);
    } else {
      addCliente(e);
    }
    e.currentTarget.reset();
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          {editing && <button className="btn secondary" onClick={() => setEditing(null)}>Cancelar</button>}
        </div>
        <div className="card-b">
          <form onSubmit={handleSubmit} key={editing?.id || 'new'} className="form-grid">
            <input name="name" className="input full" placeholder="Nombre del Cliente" defaultValue={editing?.name} required />
            <input name="zone" className="input" placeholder="Zona / Colonia" defaultValue={editing?.zone} required />
            <input name="latitude" type="number" step="any" className="input" placeholder="Latitud" defaultValue={editing?.latitude} required />
            <input name="longitude" type="number" step="any" className="input" placeholder="Longitud" defaultValue={editing?.longitude} required />
            <select name="routeId" className="select full" defaultValue={editing?.routeId} required>
              <option value="">Seleccionar Ruta de Entrega</option>
              {data.rutas.map(r => <option value={r.id} key={r.id}>{r.name} - {r.dayOfWeek}</option>)}
            </select>
            <button type="submit" className={`btn ${editing ? 'warn' : 'success'} full`}>
              {editing ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Directorio de Clientes</h3>
        </div>
        <div className="card-b list">
          {(data.rutas || []).flatMap(r => r.clientes || []).map(c => (
            <div className="item" key={c.id}>
              <div className="row">
                <b>{c.name}</b>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setEditing(c)}>âï¸</button>
                  <button className="btn primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={async () => {
                    const token = localStorage.getItem('ht_token');
                    const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/client/${c.id}/statement`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) {
                      const { orders, payments } = await res.json();
                      const txt = orders.map(o => `ð ${o.orderNumber}: ${o.totalAmount} (${o.status})`).join('\n') + 
                                  '\n\nABONOS:\n' + payments.map(p => `ð° ${p.date.split('T')[0]}: -${p.amount}`).join('\n');
                      alert(`ESTADO DE CUENTA - ${c.name.toUpperCase()}\nSaldo Actual: ${c.currentBalance}\n\n${txt || 'Sin movimientos'}`);
                    }
                  }}>ð</button>
                  <button className="btn success" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={async () => {
                    const amt = prompt(`Registrar abono para ${c.name}\nSaldo actual: ${c.currentBalance}\n\nIngresa el monto:`);
                    if (!amt || isNaN(amt)) return;
                    const method = prompt("Método de pago (Efectivo, Transferencia, Cheque):", "Efectivo");
                    const token = localStorage.getItem('ht_token');
                    const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/payment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ clientId: c.id, amount: Number(amt), paymentMethod: method })
                    });
                    if (res.ok) { alert('Abono registrado correctamente'); window.location.reload(); }
                  }}>$</button>
                </div>
              </div>
              <div className="row muted" style={{ fontSize: '0.85rem' }}>
                <span>Zona: {c.zone}</span>
                <span style={{ color: c.currentBalance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                  Saldo: {c.currentBalance > 0 ? `${c.currentBalance}` : 'Al día'}
                </span>
              </div>
              <div className="muted" style={{ fontSize: '0.75rem' }}>
                Ruta: {ruta(c.routeId)?.name || 'Sin Ruta'} Â· {c.latitude}, {c.longitude}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

