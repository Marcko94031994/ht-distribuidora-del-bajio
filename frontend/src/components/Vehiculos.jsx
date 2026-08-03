import React, { useState } from 'react';

export default function Vehiculos({ data, addVehiculo, updateVehiculo }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    placas: '',
    marca: '',
    modelo: '',
    estatus: 'Disponible'
  });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({
      placas: '',
      marca: '',
      modelo: '',
      estatus: 'Disponible'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (v) => {
    setEditing(v);
    setForm({
      placas: v.plateNumber || '',
      marca: v.brand || '',
      modelo: v.model || '',
      estatus: v.status || 'Disponible'
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      placas: form.placas,
      marca: form.marca,
      modelo: form.modelo,
      estatus: form.estatus
    };

    if (editing) {
      if (updateVehiculo) updateVehiculo(editing.id, payload);
    } else {
      if (addVehiculo) addVehiculo(payload);
    }
    setShowModal(false);
    setEditing(null);
  };

  const filteredVehiculos = (data.unidades || []).filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (v.plateNumber && v.plateNumber.toLowerCase().includes(term)) ||
      (v.brand && v.brand.toLowerCase().includes(term)) ||
      (v.model && v.model.toLowerCase().includes(term)) ||
      (v.status && v.status.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Modal Alta / Edición Unidad */}
      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="card-h">
              <h3>{editing ? 'Editar Unidad' : 'Nueva Unidad'}</h3>
              <button className="btn secondary" onClick={() => { setEditing(null); setShowModal(false); }}>Cancelar</button>
            </div>
            <div className="card-b">
              <form onSubmit={handleSubmit} className="form-grid">
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Placas de Circulación</label>
                  <input
                    name="placas"
                    className="input full"
                    placeholder="Ej. GTO-123-A"
                    value={form.placas}
                    onChange={e => setForm({ ...form, placas: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Marca</label>
                    <input
                      name="marca"
                      className="input full"
                      placeholder="Ej. Ford, Nissan, Chevrolet"
                      value={form.marca}
                      onChange={e => setForm({ ...form, marca: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Modelo / Año</label>
                    <input
                      name="modelo"
                      className="input full"
                      placeholder="Ej. NP300 2021"
                      value={form.modelo}
                      onChange={e => setForm({ ...form, modelo: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Estatus Operativo</label>
                  <select
                    name="estatus"
                    className="select full"
                    value={form.estatus}
                    onChange={e => setForm({ ...form, estatus: e.target.value })}
                    required
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="En Ruta">En Ruta</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <button type="submit" className={`btn full ${editing ? 'warn' : 'primary'}`}>
                  {editing ? 'Actualizar Unidad' : 'Guardar Unidad'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Directorio de Vehículos */}
      <div className="card">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Directorio de Vehículos / Unidades</h3>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px', justifyContent: 'flex-end' }}>
            <input 
              type="text" 
              className="input full" 
              placeholder="🔍 Buscar por placa, marca o modelo..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '180px' }}
            />
            <button className="btn success" onClick={handleOpenAdd}>+ Nueva Unidad</button>
          </div>
        </div>
        <div className="card-b list">
          {filteredVehiculos.map(v => (
            <div className="item" key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '16px' }}>{v.plateNumber}</b>
                  <span className={`chip ${v.status === 'Disponible' ? 'ok' : v.status === 'En Ruta' ? 'info' : 'danger'}`}>
                    {v.status}
                  </span>
                </div>
                <div className="muted" style={{ marginTop: '4px' }}>
                  🚗 <b>Vehículo:</b> {v.brand} {v.model}
                </div>
              </div>
              <div>
                <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleOpenEdit(v)}>
                  ✏️ Editar
                </button>
              </div>
            </div>
          ))}
          {filteredVehiculos.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '30px' }}>
              No se encontraron unidades registradas con el término de búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
