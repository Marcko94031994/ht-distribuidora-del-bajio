import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Liquidacion({ data, ruta, vendedor }) {
  const [selectedClosure, setSelectedClosure] = useState(null);

  const handleDeclare = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const token = localStorage.getItem('ht_token');
    const res = await fetch('/api/app/cash-closure/declare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        closureId: selectedClosure.id,
        totalDeclared: Number(f.get('totalDeclared')),
        observations: f.get('observations')
      })
    });

    if (res.ok) {
      alert('Liquidación completada. Se ha calculado la diferencia.');
      window.location.reload();
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Liquidación a Ciegas</h3>
          <span className="chip warn">Control de Efectivo</span>
        </div>
        <div className="card-b list">
          {data.cierresCaja?.filter(c => c.status === 'Abierto').map(c => (
            <div className={`item ${selectedClosure?.id === c.id ? 'active' : ''}`} key={c.id} onClick={() => setSelectedClosure(c)}>
              <div className="row">
                <b>{ruta(c.routeId)?.name}</b>
                <span className="chip warn">{c.status}</span>
              </div>
              <div className="muted">{vendedor(c.driverId)?.name} · {c.date.split('T')[0]}</div>
            </div>
          ))}
          {data.cierresCaja?.filter(c => c.status === 'Abierto').length === 0 && <div className="muted">No hay cierres pendientes.</div>}
        </div>
      </div>

      <div className="card double">
        <div className="card-h">
          <h3>Declaración de Valores</h3>
        </div>
        <div className="card-b">
          {!selectedClosure ? (
            <div className="muted text-center" style={{ padding: '40px' }}>Selecciona un cierre pendiente para liquidar.</div>
          ) : (
            <form onSubmit={handleDeclare} className="form-grid">
              <div className="full glass" style={{ padding: '20px', borderRadius: '12px', marginBottom: '10px' }}>
                <p><b>Instrucciones:</b> El vendedor debe declarar el total de efectivo y comprobantes que trae físicamente, sin conocer el monto esperado por el sistema.</p>
              </div>
              <div className="field full">
                <label>Monto Total Declarado ($)</label>
                <input name="totalDeclared" type="number" step="0.01" className="input" placeholder="Ej. 15420.50" required />
              </div>
              <div className="field full">
                <label>Observaciones / Faltantes detectados</label>
                <textarea name="observations" className="textarea" placeholder="Ej. El cliente X no pagó completo..."></textarea>
              </div>
              <button type="submit" className="btn success full">Finalizar y Comparar</button>
            </form>
          )}
        </div>
      </div>

      <div className="card full" style={{ gridColumn: '1 / -1' }}>
        <div className="card-h">
          <h3>Historial de Liquidaciones y Diferencias</h3>
        </div>
        <div className="card-b">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Ruta / Vendedor</th>
                <th>Esperado</th>
                <th>Declarado</th>
                <th>Gastos</th>
                <th>Diferencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.cierresCaja?.filter(c => c.status === 'Cerrado').map(c => (
                <tr key={c.id}>
                  <td>{c.date.split('T')[0]}</td>
                  <td><b>{ruta(c.routeId)?.name}</b><br/><small>{vendedor(c.driverId)?.name}</small></td>
                  <td>{pesos(c.totalExpected)}</td>
                  <td>{pesos(c.totalDeclared)}</td>
                  <td>{pesos(c.totalExpenses)}</td>
                  <td style={{ color: c.difference < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                    {pesos(c.difference)}
                  </td>
                  <td><span className="chip ok">{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
