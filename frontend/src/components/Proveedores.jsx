import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Proveedores({ data, addProveedor, updateProveedor, registrarPago }) {
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      contact: f.get('contact'),
      phone: f.get('phone')
    };

    if (editing) {
      updateProveedor(editing.id, payload);
      setEditing(null);
    } else {
      addProveedor(e);
    }
    e.currentTarget.reset();
  };

  const handlePayment = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    registrarPago({
      providerId: paying.id,
      amount: Number(f.get('amount')),
      reference: f.get('reference'),
      paymentMethod: f.get('method')
    });
    setPaying(null);
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
          {editing && <button className="btn secondary" onClick={() => setEditing(null)}>Cancelar</button>}
        </div>
        <div className="card-b">
          <form onSubmit={handleSubmit} key={editing?.id || 'new'} className="form-grid">
            <input name="name" className="input full" placeholder="Razón Social / Nombre" defaultValue={editing?.name} required />
            <input name="contact" className="input full" placeholder="Nombre de Contacto" defaultValue={editing?.contact} required />
            <input name="phone" className="input full" placeholder="Teléfono" defaultValue={editing?.phone} required />
            <button type="submit" className={`btn ${editing ? 'warn' : 'success'} full`}>
              {editing ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
            </button>
          </form>
        </div>
      </div>
      
      {paying && (
        <div className="card" style={{borderColor: 'var(--brand-beige)'}}>
          <div className="card-h">
            <h3>Pagar a {paying.name}</h3>
            <button className="btn secondary" onClick={() => setPaying(null)}>Cancelar</button>
          </div>
          <div className="card-b">
            <div className="muted" style={{marginBottom: '10px'}}>Deuda Actual: <b className="danger">{pesos(paying.currentBalance)}</b></div>
            <form onSubmit={handlePayment} className="form-grid">
              <input name="amount" type="number" step="0.01" max={paying.currentBalance} className="input full" placeholder="Monto a Pagar" required />
              <select name="method" className="select full" required>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
              </select>
              <input name="reference" className="input full" placeholder="Referencia / Folio" />
              <button type="submit" className="btn primary full">Registrar Pago</button>
            </form>
          </div>
        </div>
      )}

      <div className="card double">
        <div className="card-h">
          <h3>Directorio y Cuentas por Pagar (CxP)</h3>
        </div>
        <div className="card-b list">
          {data.proveedores?.map(p => (
            <div className="item" key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="row">
                  <b>{p.name}</b>
                  <button className="btn secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setEditing(p)}>Editar</button>
                </div>
                <div className="muted" style={{marginTop: '5px'}}>
                  Contacto: {p.contact} · Tel: {p.phone}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{fontSize: '0.8rem'}}>Saldo Pendiente</div>
                <div style={{ fontWeight: 'bold', color: p.currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {pesos(p.currentBalance || 0)}
                </div>
                {p.currentBalance > 0 && (
                  <button className="btn primary" style={{ marginTop: '5px', padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setPaying(p)}>
                    Abonar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

