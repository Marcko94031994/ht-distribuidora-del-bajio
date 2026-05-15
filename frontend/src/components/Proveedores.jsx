import React, { useState } from 'react';

export default function Proveedores({ data, addProveedor, updateProveedor }) {
  const [editing, setEditing] = useState(null);

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
      addProveedor(e); // Keeping standard event for creation if it uses FormData inside App.jsx
    }
    e.currentTarget.reset();
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
      <div className="card">
        <div className="card-h">
          <h3>Lista de Proveedores</h3>
        </div>
        <div className="card-b list">
          {data.proveedores?.map(p => (
            <div className="item" key={p.id}>
              <div className="row">
                <b>{p.name}</b>
                <button className="btn secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setEditing(p)}>Editar</button>
              </div>
              <div className="muted">
                Contacto: {p.contact} · Tel: {p.phone}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

