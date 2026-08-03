import React, { useState } from 'react';

export default function Sucursales({ data, sucursal, addSucursal, updateSucursal }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    name: '',
    zone: '',
    manager: ''
  });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ name: '', zone: '', manager: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      zone: s.zone || '',
      manager: s.manager || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      if (updateSucursal) updateSucursal(editing.id, form);
    } else {
      if (addSucursal) addSucursal(form);
    }
    setShowModal(false);
    setEditing(null);
  };

  const sucursalesList = data.sucursales || [];
  const almacenesList = data.almacenes || [];

  const filteredSucursales = sucursalesList.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.zone && s.zone.toLowerCase().includes(term)) ||
      (s.manager && s.manager.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {showModal ? (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{editing ? '✏️ Editar Sucursal' : '➕ Alta de Sucursal (Nodo principal)'}</h3>
            <button className="btn secondary" onClick={() => { setShowModal(false); setEditing(null); }}>Cancelar</button>
          </div>
          <div className="card-b">
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Nombre de la Sucursal *</label>
                <input
                  name="name"
                  className="input full"
                  placeholder="Ej. Sucursal León, Sucursal Celaya"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Zona / Ciudad *</label>
                <input
                  name="zone"
                  className="input full"
                  placeholder="Ej. León Gto, Celaya Gto"
                  value={form.zone}
                  onChange={e => setForm({ ...form, zone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Gerente / Responsable *</label>
                <input
                  name="manager"
                  className="input full"
                  placeholder="Nombre del encargado o gerente"
                  value={form.manager}
                  onChange={e => setForm({ ...form, manager: e.target.value })}
                  required
                />
              </div>
              <div className="full" style={{ marginTop: '12px' }}>
                <button type="submit" className={`btn full ${editing ? 'warn' : 'primary'}`}>
                  {editing ? '💾 Actualizar sucursal' : '✅ Guardar sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3>Directorio de Sucursales</h3>
            <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px', justifyContent: 'flex-end' }}>
              <input
                type="text"
                className="input full"
                placeholder="🔍 Buscar por nombre, zona o gerente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '180px' }}
              />
              <button className="btn success" onClick={handleOpenAdd}>+ Nueva Sucursal</button>
            </div>
          </div>
          <div className="card-b list">
            {filteredSucursales.map(s => {
              const associatedWarehouses = almacenesList.filter(a => a.branchId === s.id);
              return (
                <div className="item" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                      <b style={{ fontSize: '16px' }}>{s.name}</b>
                      <span className="chip ok">Activa</span>
                    </div>
                    <div className="muted" style={{ marginTop: '4px' }}>
                      📍 <b>Zona:</b> {s.zone} &nbsp;·&nbsp; 👤 <b>Gerente:</b> {s.manager}
                    </div>
                    <div className="muted" style={{ marginTop: '2px', fontSize: '12px' }}>
                      🏢 <b>Almacenes asociados:</b> {associatedWarehouses.length} {associatedWarehouses.length === 1 ? 'almacén' : 'almacenes'} ({associatedWarehouses.map(a => a.name).join(', ') || 'Ninguno'})
                    </div>
                  </div>
                  <div>
                    <button className="btn secondary" style={{ padding: '6px 12px' }} onClick={() => handleOpenEdit(s)}>
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredSucursales.length === 0 && (
              <div className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                No se encontraron sucursales registradas con el término de búsqueda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
