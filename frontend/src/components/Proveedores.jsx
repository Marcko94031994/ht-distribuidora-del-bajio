import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Proveedores({ data, addProveedor, updateProveedor, registrarPago }) {
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    name: '',
    rfc: '',
    contact: '',
    phone: '',
    address: ''
  });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ name: '', rfc: '', contact: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      rfc: p.rfc || '',
      contact: p.contact || '',
      phone: p.phone || '',
      address: p.address || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      rfc: form.rfc,
      contact: form.contact,
      phone: form.phone,
      address: form.address
    };

    if (editing) {
      if (updateProveedor) updateProveedor(editing.id, payload);
    } else {
      if (addProveedor) addProveedor(payload);
    }
    setShowModal(false);
    setEditing(null);
  };

  const handlePayment = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (registrarPago && paying) {
      registrarPago({
        providerId: paying.id,
        amount: Number(f.get('amount')),
        reference: f.get('reference') || '',
        paymentMethod: f.get('method')
      });
    }
    setPaying(null);
  };

  const filteredProveedores = (data.proveedores || []).filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.contact && p.contact.toLowerCase().includes(term)) ||
      (p.rfc && p.rfc.toLowerCase().includes(term)) ||
      (p.phone && p.phone.toLowerCase().includes(term)) ||
      (p.address && p.address.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Formulario Alta / Edición Proveedor */}
      {showModal ? (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{editing ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}</h3>
            <button className="btn secondary" onClick={() => { setEditing(null); setShowModal(false); }}>Cancelar</button>
          </div>
          <div className="card-b">
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Razón Social / Nombre Comercial *</label>
                <input
                  name="name"
                  className="input full"
                  placeholder="Ej. Distribuidora Mayorista SA de CV"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>RFC</label>
                <input
                  name="rfc"
                  className="input full"
                  placeholder="Ej. DMA980101ABC"
                  value={form.rfc}
                  onChange={e => setForm({ ...form, rfc: e.target.value })}
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Teléfono *</label>
                <input
                  name="phone"
                  className="input full"
                  placeholder="Ej. 4771234567"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Nombre de Contacto / Atención *</label>
                <input
                  name="contact"
                  className="input full"
                  placeholder="Ej. Lic. Carlos Mendoza"
                  value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Domicilio / Dirección</label>
                <input
                  name="address"
                  className="input full"
                  placeholder="Ej. Av. Central #123, Parque Industrial"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="full" style={{ marginTop: '12px' }}>
                <button type="submit" className={`btn full ${editing ? 'warn' : 'primary'}`}>
                  {editing ? '💾 Actualizar Proveedor' : '✅ Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : paying ? (
        /* Formulario Abono a Proveedor */
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>💵 Pagar a {paying.name}</h3>
            <button className="btn secondary" onClick={() => setPaying(null)}>Cancelar</button>
          </div>
          <div className="card-b">
            <div className="muted" style={{ marginBottom: '15px', fontSize: '15px' }}>
              Deuda Actual: <b className="danger" style={{ fontSize: '18px', color: 'var(--danger)' }}>{pesos(paying.currentBalance || 0)}</b>
            </div>
            <form onSubmit={handlePayment} className="form-grid">
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Monto a Pagar *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  max={paying.currentBalance || undefined}
                  className="input full"
                  placeholder="Monto a Pagar"
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Método de Pago *</label>
                <select name="method" className="select full" required>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Referencia / Folio</label>
                <input name="reference" className="input full" placeholder="Ej. TRANSF-8934" />
              </div>
              <div className="full" style={{ marginTop: '12px' }}>
                <button type="submit" className="btn primary full">✅ Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Directorio de Proveedores */
        <div className="card">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Directorio de Proveedores y Cuentas por Pagar (CxP)</h3>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px', justifyContent: 'flex-end' }}>
            <input
              type="text"
              className="input full"
              placeholder="🔍 Buscar proveedor, RFC o teléfono..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '180px' }}
            />
            <button className="btn success" onClick={handleOpenAdd}>+ Nuevo Proveedor</button>
          </div>
        </div>
        <div className="card-b list">
          {filteredProveedores.map(p => (
            <div className="item" key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '16px' }}>{p.name}</b>
                  {p.rfc && <span className="chip" style={{ background: 'var(--brand-beige)', color: '#333' }}>RFC: {p.rfc}</span>}
                </div>
                <div className="muted" style={{ marginTop: '4px' }}>
                  👤 <b>Contacto:</b> {p.contact || 'No especificado'} &nbsp;·&nbsp; 📞 <b>Tel:</b> {p.phone || 'Sin registrar'}
                </div>
                {p.address && <div className="muted" style={{ marginTop: '2px', fontSize: '12px' }}>📍 <b>Domicilio:</b> {p.address}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>Saldo Pendiente</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: (p.currentBalance || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {pesos(p.currentBalance || 0)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(p.currentBalance || 0) > 0 && (
                    <button className="btn primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setPaying(p)}>
                      Abonar
                    </button>
                  )}
                  <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleOpenEdit(p)}>
                    ✏️ Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredProveedores.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '30px' }}>
              No se encontraron proveedores que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}


