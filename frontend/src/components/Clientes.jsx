import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Clientes({ data, addCliente, updateCliente, ruta }) {
  const [editing, setEditing] = useState(null);
  const [statementData, setStatementData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      zone: f.get('zone'),
      latitude: Number(f.get('latitude')),
      longitude: Number(f.get('longitude')),
      routeId: Number(f.get('routeId')),
      creditLimit: Number(f.get('creditLimit') || 0),
      creditDays: Number(f.get('creditDays') || 30)
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
            <input name="zone" className="input full" placeholder="Zona / Colonia" defaultValue={editing?.zone} required />
            <input name="latitude" type="number" step="any" className="input" placeholder="Latitud" defaultValue={editing?.latitude} required />
            <input name="longitude" type="number" step="any" className="input" placeholder="Longitud" defaultValue={editing?.longitude} required />
            <input name="creditLimit" type="number" step="any" className="input" placeholder="Límite de Crédito ($)" defaultValue={editing?.creditLimit} />
            <input name="creditDays" type="number" className="input" placeholder="Días de Crédito (ej. 15, 30)" defaultValue={editing?.creditDays || 30} />
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
                  <button className="btn secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setEditing(c)}>✏️</button>
                  <button className="btn primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={async () => {
                    const token = localStorage.getItem('ht_token');
                    const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/client/${c.id}/statement`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) {
                      const { orders, payments } = await res.json();
                      setStatementData({ client: c, orders, payments });
                    }
                  }}>📋</button>
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

      {statementData && (
        <div className="modal-overlay" onClick={() => setStatementData(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div id="print-area" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid var(--line)', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--primary)' }}>ESTADO DE CUENTA</h2>
                <h3 style={{ margin: '5px 0 0 0', color: 'var(--text)' }}>{statementData.client.name.toUpperCase()}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '5px' }}>
                  {statementData.client.rfc && `RFC: ${statementData.client.rfc} | `} 
                  {statementData.client.regimenFiscal && `Régimen: ${statementData.client.regimenFiscal} | `} 
                  {statementData.client.codigoPostal && `CP: ${statementData.client.codigoPostal}`}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Límite de Crédito</div>
                  <b style={{ fontSize: '1.2rem', color: 'var(--text)' }}>{pesos(statementData.client.creditLimit)}</b>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Saldo Actual</div>
                  <b style={{ fontSize: '1.2rem', color: statementData.client.currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {pesos(statementData.client.currentBalance)}
                  </b>
                </div>
              </div>

              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '5px' }}>Historial de Cargos (Pedidos)</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>Fecha</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>Folio / Ticket</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>Estatus</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>Cargo</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData.orders.length === 0 ? <tr><td colSpan="4" style={{ padding: '8px', textAlign: 'center', color: 'var(--muted)' }}>No hay cargos registrados.</td></tr> : statementData.orders.map(o => (
                    <tr key={`order-${o.id}`}>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>{o.date.split('T')[0]}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}><b>{o.orderNumber}</b></td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>{o.status}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)', textAlign: 'right', color: 'var(--danger)' }}>{pesos(o.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '5px' }}>Historial de Abonos (Pagos)</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>Fecha</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>Método</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>Referencia</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>Abono</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData.payments.length === 0 ? <tr><td colSpan="4" style={{ padding: '8px', textAlign: 'center', color: 'var(--muted)' }}>No hay abonos registrados.</td></tr> : statementData.payments.map(p => (
                    <tr key={`payment-${p.id}`}>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>{p.date.split('T')[0]}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>{p.paymentMethod}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)' }}>{p.reference || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--line)', textAlign: 'right', color: 'var(--success)' }}>-{pesos(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '15px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button className="btn secondary" onClick={() => setStatementData(null)}>Cerrar</button>
              <button className="btn primary" onClick={() => {
                const printContents = document.getElementById('print-area').innerHTML;
                const originalContents = document.body.innerHTML;
                document.body.innerHTML = printContents;
                window.print();
                document.body.innerHTML = originalContents;
                window.location.reload();
              }}>🖨️ Imprimir PDF</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

