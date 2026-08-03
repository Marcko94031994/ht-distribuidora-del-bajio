import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';

export default function AlmacenesCatalogo({ data, sucursal, addAlmacen, updateAlmacen, reloadState }) {
  const [showAlmacenModal, setShowAlmacenModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [editingAlmacen, setEditingAlmacen] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouseLayout, setFilterWarehouseLayout] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    sucursalId: '',
    tipo: 'Principal',
    responsable: ''
  });

  const handleOpenAdd = () => {
    setEditingAlmacen(null);
    setForm({
      nombre: '',
      sucursalId: data.sucursales?.[0]?.id ? String(data.sucursales[0].id) : '',
      tipo: 'Principal',
      responsable: ''
    });
    setShowAlmacenModal(true);
  };

  const handleOpenEdit = (a) => {
    setEditingAlmacen(a);
    setForm({
      nombre: a.name || '',
      sucursalId: a.branchId ? String(a.branchId) : '',
      tipo: a.type || 'Principal',
      responsable: a.manager || ''
    });
    setShowAlmacenModal(true);
  };

  const handleSubmitAlmacen = (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      sucursalId: Number(form.sucursalId),
      tipo: form.tipo,
      responsable: form.responsable
    };

    if (editingAlmacen) {
      if (updateAlmacen) updateAlmacen(editingAlmacen.id, payload);
    } else {
      if (addAlmacen) addAlmacen(payload);
    }
    setShowAlmacenModal(false);
    setEditingAlmacen(null);
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const token = localStorage.getItem('ht_token');
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: f.get('name'),
          description: f.get('description'),
          warehouseId: Number(f.get('warehouseId'))
        })
      });
      if (res.ok) {
        setShowUbicacionModal(false);
        if (reloadState) reloadState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const almacenesList = data.almacenes || [];
  const ubicacionesList = data.ubicaciones || [];

  const filteredAlmacenes = almacenesList.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const branchName = sucursal(a.branchId)?.name || '';
    return (
      (a.name && a.name.toLowerCase().includes(term)) ||
      (a.type && a.type.toLowerCase().includes(term)) ||
      (a.manager && a.manager.toLowerCase().includes(term)) ||
      branchName.toLowerCase().includes(term)
    );
  });

  const filteredUbicaciones = ubicacionesList.filter(u => {
    if (!filterWarehouseLayout) return true;
    return String(u.warehouseId) === String(filterWarehouseLayout);
  });

  return (
    <div>
      {/* Formulario Alta / Edición Almacén */}
      {showAlmacenModal ? (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{editingAlmacen ? '✏️ Editar Almacén' : '➕ Alta de Almacén (Ligado a sucursal)'}</h3>
            <button className="btn secondary" onClick={() => { setShowAlmacenModal(false); setEditingAlmacen(null); }}>Cancelar</button>
          </div>
          <div className="card-b">
            <form onSubmit={handleSubmitAlmacen} className="form-grid">
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Nombre del Almacén *</label>
                <input
                  name="nombre"
                  className="input full"
                  placeholder="Ej. Bodega Central Sur, Almacén Fríos"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Sucursal Asignada *</label>
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
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Tipo de Almacén *</label>
                <select
                  name="tipo"
                  className="select full"
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  required
                >
                  <option value="Principal">Principal</option>
                  <option value="Sucursal">Sucursal</option>
                  <option value="Temporal">Temporal</option>
                </select>
              </div>
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Responsable de Almacén *</label>
                <input
                  name="responsable"
                  className="input full"
                  placeholder="Nombre del jefe o encargado de almacén"
                  value={form.responsable}
                  onChange={e => setForm({ ...form, responsable: e.target.value })}
                  required
                />
              </div>
              <div className="full" style={{ marginTop: '12px' }}>
                <button type="submit" className={`btn full ${editingAlmacen ? 'warn' : 'primary'}`}>
                  {editingAlmacen ? '💾 Actualizar almacén' : '✅ Guardar almacén'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : showUbicacionModal ? (
        /* Formulario Alta Ubicación */
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>➕ Alta de Ubicación / Rack</h3>
            <button className="btn secondary" onClick={() => setShowUbicacionModal(false)}>Cancelar</button>
          </div>
          <div className="card-b">
            <form onSubmit={handleAddLocation} className="form-grid">
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Almacén *</label>
                <SearchableSelect
                  options={data.almacenes || []}
                  value={filterWarehouseLayout || ''}
                  onChange={val => setFilterWarehouseLayout(val)}
                  name="warehouseId"
                  getOptionLabel={a => a.name}
                  getOptionValue={a => a.id}
                  placeholder="Seleccionar Almacén..."
                  required
                />
              </div>
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Nombre de Ubicación *</label>
                <input name="name" className="input full" placeholder="Ej. Pasillo 1 - Rack A, Anaquel 3" required />
              </div>
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Descripción Adicional (Opcional)</label>
                <input name="description" className="input full" placeholder="Ej. Productos secos / Nivel bajo" />
              </div>
              <div className="full" style={{ marginTop: '12px' }}>
                <button type="submit" className="btn primary full">✅ Guardar Ubicación</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Listado de Almacenes */}
          <div className="card" style={{ marginBottom: '30px' }}>
            <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3>Directorio de Almacenes</h3>
              <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  className="input full"
                  placeholder="🔍 Buscar almacén, sucursal o responsable..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <button className="btn success" onClick={handleOpenAdd}>+ Nuevo Almacén</button>
              </div>
            </div>
            <div className="card-b list">
              {filteredAlmacenes.map(a => {
                const locCount = ubicacionesList.filter(u => u.warehouseId === a.id).length;
                const typeChipClass = a.type === 'Principal' ? 'ok' : a.type === 'Temporal' ? 'warn' : 'info';
                return (
                  <div className="item" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                        <b style={{ fontSize: '16px' }}>{a.name}</b>
                        <span className={`chip ${typeChipClass}`}>{a.type}</span>
                      </div>
                      <div className="muted" style={{ marginTop: '4px' }}>
                        🏢 <b>Sucursal:</b> {sucursal(a.branchId)?.name || 'Sin sucursal'} &nbsp;·&nbsp; 👤 <b>Responsable:</b> {a.manager || 'No asignado'}
                      </div>
                      <div className="muted" style={{ marginTop: '2px', fontSize: '12px' }}>
                        📍 <b>Racks / Ubicaciones:</b> {locCount} registradas
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn secondary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => {
                          setFilterWarehouseLayout(String(a.id));
                          const el = document.getElementById('layout-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        📍 Ver Racks ({locCount})
                      </button>
                      <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleOpenEdit(a)}>
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredAlmacenes.length === 0 && (
                <div className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  No se encontraron almacenes registrados con el término de búsqueda.
                </div>
              )}
            </div>
          </div>

      {/* Layout de Almacén (Ubicaciones y Racks) */}
      <div className="card double" id="layout-section">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3>Layout de Almacén (Ubicaciones y Racks)</h3>
            <span className="muted" style={{ fontSize: '12px' }}>Organización de pasillos, estantes y bodegas</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="select"
              style={{ width: '220px' }}
              value={filterWarehouseLayout}
              onChange={e => setFilterWarehouseLayout(e.target.value)}
            >
              <option value="">Todos los Almacenes</option>
              {data.almacenes?.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}
            </select>
            <button className="btn success" onClick={() => setShowUbicacionModal(true)}>+ Nueva Ubicación</button>
          </div>
        </div>
        <div className="card-b">
          <table className="table full">
            <thead>
              <tr>
                <th>Almacén</th>
                <th>Nombre de Ubicación / Rack</th>
                <th>Descripción Adicional</th>
              </tr>
            </thead>
            <tbody>
              {filteredUbicaciones.map(u => {
                const wh = data.almacenes?.find(a => a.id === u.warehouseId);
                return (
                  <tr key={u.id}>
                    <td><b>{wh?.name || 'General'}</b></td>
                    <td><span className="chip" style={{ background: 'var(--brand-beige)', color: '#333' }}>📍 {u.name}</span></td>
                    <td className="muted">{u.description || 'Sin notas'}</td>
                  </tr>
                );
              })}
              {filteredUbicaciones.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '24px' }} className="muted">
                    No hay ubicaciones registradas para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
