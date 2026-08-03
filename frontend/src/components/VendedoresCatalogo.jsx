import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';

export default function VendedoresCatalogo({ data, sucursal, addVendedor, updateVendedor }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    comision: 0,
    status: 'Activo',
    vehiculoId: '',
    sucursalId: ''
  });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({
      nombre: '',
      telefono: '',
      comision: 0,
      status: 'Activo',
      vehiculoId: '',
      sucursalId: data.sucursales?.[0]?.id ? String(data.sucursales[0].id) : ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (v) => {
    setEditing(v);
    setForm({
      nombre: v.name || '',
      telefono: v.phone || '',
      comision: v.commissionPercentage || 0,
      status: v.status || 'Activo',
      vehiculoId: v.vehicleId ? String(v.vehicleId) : '',
      sucursalId: v.branchId ? String(v.branchId) : ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      telefono: form.telefono,
      comision: Number(form.comision),
      status: form.status,
      vehiculoId: form.vehiculoId ? Number(form.vehiculoId) : null,
      sucursalId: Number(form.sucursalId)
    };

    if (editing) {
      if (updateVendedor) updateVendedor(editing.id, payload);
    } else {
      if (addVendedor) addVendedor(payload);
    }
    setShowModal(false);
    setEditing(null);
  };

  const vendedoresList = data.vendedores || [];

  const filteredVendedores = vendedoresList.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const branchName = sucursal(v.branchId)?.name || '';
    return (
      (v.name && v.name.toLowerCase().includes(term)) ||
      (v.phone && v.phone.toLowerCase().includes(term)) ||
      branchName.toLowerCase().includes(term) ||
      (v.status && v.status.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="card-h">
              <h3>{editing ? 'Editar Vendedor / Chofer' : 'Alta de Vendedor / Chofer'}</h3>
              <button className="btn secondary" onClick={() => { setShowModal(false); setEditing(null); }}>Cancelar</button>
            </div>
            <div className="card-b">
              <form onSubmit={handleSubmit} className="form-grid">
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Nombre Completo</label>
                  <input
                    name="nombre"
                    className="input full"
                    placeholder="Ej. Juan Pérez González"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Teléfono</label>
                  <input
                    name="telefono"
                    className="input full"
                    placeholder="Ej. 4771234567"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>% Comisión</label>
                    <input
                      name="comision"
                      type="number"
                      step="0.01"
                      className="input full"
                      placeholder="% Comisión"
                      value={form.comision}
                      onChange={e => setForm({ ...form, comision: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Estatus</label>
                    <select
                      name="status"
                      className="select full"
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      required
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Unidad / Vehículo Asignado</label>
                  <SearchableSelect
                    options={[{ id: '', label: 'Sin unidad asignada' }, ...(data.unidades || []).map(u => ({ id: u.id, label: `${u.brand} ${u.model} (${u.plateNumber})` }))]}
                    value={form.vehiculoId}
                    onChange={val => setForm({ ...form, vehiculoId: val })}
                    getOptionLabel={u => u.label}
                    getOptionValue={u => u.id}
                    placeholder="Buscar unidad vehicular..."
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Sucursal</label>
                  <SearchableSelect
                    options={data.sucursales || []}
                    value={form.sucursalId}
                    onChange={val => setForm({ ...form, sucursalId: val })}
                    getOptionLabel={s => `${s.name} (${s.zone})`}
                    getOptionValue={s => s.id}
                    placeholder="Seleccionar sucursal..."
                    required
                  />
                </div>
                <button type="submit" className={`btn full ${editing ? 'warn' : 'primary'}`}>
                  {editing ? 'Actualizar vendedor' : 'Guardar vendedor'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Directorio de Vendedores y Choferes</h3>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px', justifyContent: 'flex-end' }}>
            <input
              type="text"
              className="input full"
              placeholder="🔍 Buscar por nombre, teléfono o sucursal..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '180px' }}
            />
            <button className="btn success" onClick={handleOpenAdd}>+ Nuevo Vendedor</button>
          </div>
        </div>
        <div className="card-b list">
          {filteredVendedores.map(v => {
            const assignedUnit = data.unidades?.find(u => u.id === v.vehicleId);
            const statusClass = v.status === 'Activo' ? 'ok' : v.status === 'Baja' ? 'danger' : 'warn';
            return (
              <div className="item" key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                    <b style={{ fontSize: '16px' }}>{v.name}</b>
                    <span className={`chip ${statusClass}`}>{v.status || 'Activo'}</span>
                  </div>
                  <div className="muted" style={{ marginTop: '4px' }}>
                    📞 <b>Teléfono:</b> {v.phone || 'Sin registrar'} &nbsp;·&nbsp; 🏢 <b>Sucursal:</b> {sucursal(v.branchId)?.name || 'Sin sucursal'}
                  </div>
                  <div className="muted" style={{ marginTop: '2px', fontSize: '12px' }}>
                    🚚 <b>Unidad asignada:</b> {assignedUnit ? `${assignedUnit.brand} ${assignedUnit.model} (${assignedUnit.plateNumber})` : 'Ninguna'} &nbsp;·&nbsp; 💰 <b>Comisión:</b> {v.commissionPercentage || 0}%
                  </div>
                </div>
                <div>
                  <button className="btn secondary" style={{ padding: '6px 12px' }} onClick={() => handleOpenEdit(v)}>
                    ✏️ Editar
                  </button>
                </div>
              </div>
            );
          })}
          {filteredVendedores.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '30px' }}>
              No se encontraron vendedores registrados con el término de búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
