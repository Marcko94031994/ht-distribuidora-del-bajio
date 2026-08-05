import React, { useState, useEffect } from 'react';
import { pesos } from '../utils/helpers';

export default function CajaGeneral({ data }) {
  const [summary, setSummary] = useState(null);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [declaredCash, setDeclaredCash] = useState('');
  const [observations, setObservations] = useState('');

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/finance/daily-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSummary(await res.json());

      const resC = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/finance/daily-closures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resC.ok) setClosures(await resC.json());
      
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleClose = async (e) => {
    e.preventDefault();
    if (!declaredCash) return;

    if (!confirm('¿Estás seguro de realizar el corte de caja con este monto? Esta acción no se puede deshacer.')) return;

    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/finance/daily-closure`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          declaredCashInSafe: Number(declaredCash),
          observations: observations
        })
      });

      if (res.ok) {
        alert('Corte de caja realizado exitosamente.');
        setDeclaredCash('');
        setObservations('');
        fetchSummary();
      } else {
        const error = await res.text();
        alert('Error: ' + error);
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al realizar el cierre.');
    }
  };

  if (loading) return <div>Cargando resumen de caja...</div>;

  const todayHasClosure = closures.some(c => new Date(c.date).toDateString() === new Date().toDateString());

  return (
    <div className="grid two">
      <div className="card">
        <div className="card-h">
          <h3>Arqueo de Caja (En vivo)</h3>
        </div>
        <div className="card-b">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
              <span>Entradas (Liquidaciones de Ruta):</span>
              <b className="ok">{pesos(summary?.totalRouteCash || 0)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
              <span>Salidas (Gastos de Sucursal en Efectivo):</span>
              <b className="warn">- {pesos(summary?.totalBranchExpenses || 0)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
              <span><b>Efectivo Esperado en Caja:</b></span>
              <b className="primary">{pesos(summary?.expectedCashInSafe || 0)}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Declaración para Cierre de Día</h3>
        </div>
        <div className="card-b">
          {todayHasClosure ? (
            <div className="muted text-center" style={{ padding: '20px' }}>
              Ya se ha realizado un cierre de caja el día de hoy.
            </div>
          ) : (
            <form onSubmit={handleClose} className="form-grid">
              <label style={{ fontSize: '0.9rem', color: 'var(--text)' }}>Cuenta físicamente el efectivo en la caja fuerte y declara el total:</label>
              <input 
                type="number" 
                step="0.01" 
                className="input full" 
                placeholder="Monto físico ($)" 
                value={declaredCash} 
                onChange={e => setDeclaredCash(e.target.value)} 
                required 
              />
              <textarea 
                className="input full" 
                placeholder="Observaciones (opcional)..." 
                value={observations} 
                onChange={e => setObservations(e.target.value)} 
              ></textarea>
              <button type="submit" className="btn primary full">Registrar Faltante/Sobrante y Cerrar Día</button>
            </form>
          )}
        </div>
      </div>

      <div className="card double" style={{ gridColumn: '1 / -1' }}>
        <div className="card-h">
          <h3>Historial de Cortes de Caja</h3>
        </div>
        <div className="card-b">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Efectivo Esperado</th>
                  <th>Efectivo Declarado</th>
                  <th>Diferencia</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {closures.map(c => (
                  <tr key={c.id}>
                    <td><b>{new Date(c.date).toLocaleString()}</b></td>
                    <td className="muted">{pesos(c.expectedCashInSafe)}</td>
                    <td>{pesos(c.declaredCashInSafe)}</td>
                    <td>
                      <span className={`chip ${c.difference === 0 ? 'ok' : c.difference < 0 ? 'danger' : 'warn'}`}>
                        {c.difference > 0 ? '+' : ''}{pesos(c.difference)}
                      </span>
                    </td>
                    <td className="muted">{c.observations || '-'}</td>
                  </tr>
                ))}
                {closures.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center muted">No hay cortes de caja registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
