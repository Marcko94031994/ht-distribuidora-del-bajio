import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Liquidacion({ data, ruta, vendedor }) {
  const [selectedClosure, setSelectedClosure] = useState(null);
  const [expenses, setExpenses] = useState([]);

  const handleAddExpense = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = Number(f.get('amount'));
    if (!amount || amount <= 0) return;
    
    setExpenses([...expenses, {
      concept: f.get('concept'),
      amount: amount
    }]);
    e.target.reset();
  };

  const handleDeclare = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const token = localStorage.getItem('ht_token');
    
    const totalExpenses = expenses.reduce((sum, ex) => sum + ex.amount, 0);

    // Save each expense directly
    for (let ex of expenses) {
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          concept: ex.concept,
          amount: ex.amount,
          referenceNumber: `Route-${selectedClosure.routeId}-Driver-${selectedClosure.driverId}`,
          expenseCategoryId: 1
        })
      });
    }

    const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/cash-closure/declare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        closureId: selectedClosure.id,
        totalDeclared: Number(f.get('totalDeclared')),
        totalExpenses: totalExpenses,
        observations: f.get('observations')
      })
    });

    if (res.ok) {
      alert('Liquidación completada. Se ha calculado la diferencia.');
      window.location.reload();
    }
  };

  const totalGastos = expenses.reduce((sum, ex) => sum + ex.amount, 0);

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Liquidación a Ciegas</h3>
          <span className="chip warn">Control de Efectivo</span>
        </div>
        <div className="card-b list">
          {data.cierresCaja?.filter(c => c.status === 'Abierto').map(c => (
            <div className={`item ${selectedClosure?.id === c.id ? 'active' : ''}`} key={c.id} onClick={() => { setSelectedClosure(c); setExpenses([]); }}>
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
          <h3>Declaración de Valores y Gastos</h3>
        </div>
        <div className="card-b">
          {!selectedClosure ? (
            <div className="muted text-center" style={{ padding: '40px' }}>Selecciona un cierre pendiente para liquidar.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Gastos de Ruta */}
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Registrar Gastos de Ruta</h4>
                <form onSubmit={handleAddExpense} className="form-grid" style={{ marginBottom: '15px' }}>
                  <input name="concept" className="input full" placeholder="Concepto (ej. Gasolina)" required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                    <input name="amount" type="number" step="0.01" className="input" placeholder="Monto ($)" required />
                    <button type="submit" className="btn secondary">+</button>
                  </div>
                </form>
                {expenses.length > 0 && (
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                    {expenses.map((ex, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                        <span>{ex.concept}</span>
                        <b className="danger">-{pesos(ex.amount)}</b>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid #cbd5e1', paddingTop: '5px' }}>
                      <b>Total Gastos</b>
                      <b>{pesos(totalGastos)}</b>
                    </div>
                  </div>
                )}
              </div>

              {/* Declaración */}
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Efectivo Declarado</h4>
                <form onSubmit={handleDeclare} className="form-grid">
                  <div className="full glass" style={{ padding: '15px', borderRadius: '12px', marginBottom: '10px', fontSize: '0.9rem' }}>
                    <p style={{ margin: 0 }}>El vendedor debe declarar el efectivo físico total que entrega, sin conocer el monto esperado.</p>
                  </div>
                  <div className="field full">
                    <label>Efectivo a entregar en caja ($)</label>
                    <input name="totalDeclared" type="number" step="0.01" className="input" placeholder="Ej. 15420.50" required />
                  </div>
                  <div className="field full">
                    <label>Observaciones / Faltantes</label>
                    <textarea name="observations" className="textarea" placeholder="Ej. El cliente X no pagó completo..."></textarea>
                  </div>
                  <button type="submit" className="btn success full">Finalizar y Comparar</button>
                </form>
              </div>
            </div>
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
