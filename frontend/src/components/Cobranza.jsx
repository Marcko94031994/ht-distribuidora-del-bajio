import React, { useState, useMemo } from 'react';
import { pesos } from '../utils/helpers';

export default function Cobranza({ data, reloadState }) {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [statement, setStatement] = useState(null);

  const portfolio = useMemo(() => {
    const clients = (data.rutas || []).flatMap(r => r.clients || []);
    return clients.filter(c => 
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.zone.toLowerCase().includes(search.toLowerCase())) &&
      c.currentBalance > 0
    ).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [data.rutas, search]);

  const totalReceivable = portfolio.reduce((sum, c) => sum + c.currentBalance, 0);

  const fetchStatement = async (client) => {
    const token = localStorage.getItem('ht_token');
    const res = await fetch(`/api/app/client/${client.id}/statement`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    if (res.ok) {
      const json = await res.json();
      setStatement(json);
      setSelectedClient(client);
    }
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = Number(f.get('amount'));
    if (!amount || amount <= 0) return alert('Monto inválido');

    const token = localStorage.getItem('ht_token');
    const res = await fetch('/api/app/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        clientId: selectedClient.id, 
        amount, 
        paymentMethod: f.get('method'),
        reference: f.get('ref')
      })
    });

    if (res.ok) {
      alert('Abono registrado con éxito');
      reloadState();
      fetchStatement(selectedClient); // Refresh statement
      e.currentTarget.reset();
    }
  };

  return (
    <div className="view-container animate-fade-in">
      {/* Header & KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginBottom: '30px' }}>
        <div className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>💰 Gestión de Cobranza (CxC)</h2>
          <p className="muted">Administra el flujo de efectivo y saldos pendientes de clientes.</p>
        </div>
        <div className="kpi-card" style={{ background: 'var(--primary)', color: 'white' }}>
          <div className="kpi-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Total por Cobrar</div>
          <div className="kpi-value" style={{ fontSize: '2.2rem' }}>{pesos(totalReceivable)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '30px' }}>
        {/* Cartera de Clientes */}
        <div className="glass" style={{ padding: '20px', borderRadius: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <input 
              className="input full" 
              placeholder="🔍 Buscar por nombre o zona..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: '15px' }}
            />
          </div>
          <table className="table full">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Zona</th>
                <th>Saldo Pendiente</th>
                <th>Estatus</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => fetchStatement(c)}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td className="muted">{c.zone}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 800 }}>{pesos(c.currentBalance)}</td>
                  <td>
                    {c.hasOverdueDebt ? 
                      <span className="chip danger">Vencido</span> : 
                      <span className="chip warn">Pendiente</span>
                    }
                  </td>
                  <td>
                    <button className="btn primary small" onClick={(e) => { e.stopPropagation(); fetchStatement(c); }}>
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalle / Estado de Cuenta / Registro de Pago */}
        <div className="glass" style={{ padding: '25px', borderRadius: '24px', height: 'fit-content', position: 'sticky', top: '20px' }}>
          {selectedClient ? (
            <>
              <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '15px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>{selectedClient.name}</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--danger)', marginTop: '5px' }}>
                  {pesos(selectedClient.currentBalance)}
                </div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Límite: {pesos(selectedClient.creditLimit)}</div>
              </div>

              {/* Formulario de Abono */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>💵 Registrar Nuevo Abono</h4>
                <form onSubmit={registrarAbono} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input name="amount" type="number" step="any" className="input full" placeholder="Monto del abono" required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <select name="method" className="input full">
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                      <option>Cheque</option>
                    </select>
                    <input name="ref" className="input full" placeholder="Referencia / Folio" />
                  </div>
                  <button type="submit" className="btn success full">Confirmar Pago</button>
                </form>
              </div>

              {/* Historial Reciente */}
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>🕒 Movimientos Recientes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {statement?.orders.map(o => (
                    <div key={o.orderNumber} style={{ fontSize: '0.85rem', padding: '8px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📄 {o.orderNumber} ({o.status})</span>
                      <b style={{ color: 'var(--danger)' }}>+{pesos(o.totalAmount)}</b>
                    </div>
                  ))}
                  {statement?.payments.map(p => (
                    <div key={p.id} style={{ fontSize: '0.85rem', padding: '8px', background: '#ecfdf5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', border: '1px solid #10b981' }}>
                      <span>💰 Abono {p.paymentMethod} ({p.date.split('T')[0]})</span>
                      <b style={{ color: '#059669' }}>-{pesos(p.amount)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              <span style={{ fontSize: '3rem' }}>🧐</span>
              <p>Selecciona un cliente para ver su estado de cuenta y registrar pagos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
