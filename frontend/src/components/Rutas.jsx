import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';

export default function Rutas({ data, sucursal, vendedor, addRuta, updateRuta, selectedRuta, setSelectedRuta, setSelectedCliente }) {
  const [showRutaModal, setShowRutaModal] = useState(false);
  const [editingRuta, setEditingRuta] = useState(null);
  const [searchRuta, setSearchRuta] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    dia: 'Lunes',
    sucursalId: '',
    vendedorId: '',
    clientesText: ''
  });

  const handleOpenAdd = () => {
    setEditingRuta(null);
    setForm({
      nombre: '',
      dia: 'Lunes',
      sucursalId: data.sucursales?.[0]?.id ? String(data.sucursales[0].id) : '',
      vendedorId: data.vendedores?.[0]?.id ? String(data.vendedores[0].id) : '',
      clientesText: ''
    });
    setShowRutaModal(true);
  };

  const handleOpenEdit = (r) => {
    setEditingRuta(r);
    setForm({
      nombre: r.name || '',
      dia: r.dayOfWeek || 'Lunes',
      sucursalId: r.branchId ? String(r.branchId) : '',
      vendedorId: r.driverId ? String(r.driverId) : '',
      clientesText: (r.clientes || []).map(c => c.name).join(', ')
    });
    setShowRutaModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      dia: form.dia,
      sucursalId: Number(form.sucursalId),
      vendedorId: Number(form.vendedorId),
      clientesText: form.clientesText
    };

    if (editingRuta) {
      if (updateRuta) updateRuta(editingRuta.id, payload);
    } else {
      if (addRuta) addRuta(payload);
    }
    setShowRutaModal(false);
    setEditingRuta(null);
  };

  const filteredRutas = (data.rutas || []).filter(r => {
    if (!searchRuta) return true;
    const term = searchRuta.toLowerCase();
    const branchName = sucursal(r.branchId)?.name || '';
    const driverName = vendedor(r.driverId)?.name || '';
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.dayOfWeek && r.dayOfWeek.toLowerCase().includes(term)) ||
      branchName.toLowerCase().includes(term) ||
      driverName.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      {showRutaModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="card-h">
              <h3>{editingRuta ? 'Editar Ruta' : 'Alta de Ruta de Entrega'}</h3>
              <button className="btn secondary" onClick={() => { setShowRutaModal(false); setEditingRuta(null); }}>Cancelar</button>
            </div>
            <div className="card-b">
              <form onSubmit={handleSubmit} className="form-grid">
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Nombre de la Ruta</label>
                  <input
                    name="nombre"
                    className="input full"
                    placeholder="Ej. Ruta León Norte, Ruta Celaya Centro"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Día de Visita / Entrega</label>
                  <select
                    name="dia"
                    className="select full"
                    value={form.dia}
                    onChange={e => setForm({ ...form, dia: e.target.value })}
                    required
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Sucursal</label>
                  <SearchableSelect
                    options={data.sucursales || []}
                    value={form.sucursalId}
                    onChange={val => setForm({ ...form, sucursalId: val })}
                    getOptionLabel={s => s.name}
                    getOptionValue={s => s.id}
                    placeholder="Seleccionar sucursal..."
                    required
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Vendedor / Chofer Asignado</label>
                  <SearchableSelect
                    options={data.vendedores || []}
                    value={form.vendedorId}
                    onChange={val => setForm({ ...form, vendedorId: val })}
                    getOptionLabel={v => `${v.name} (${v.phone || 'Sin tel'})`}
                    getOptionValue={v => v.id}
                    placeholder="Seleccionar vendedor..."
                    required
                  />
                </div>
                {!editingRuta && (
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Clientes Iniciales (Opcional, separados por coma)</label>
                    <textarea
                      name="clientes"
                      className="textarea full"
                      placeholder="Ej. Tienda Doña Mary, Abarrotes San Juan, Super Express"
                      value={form.clientesText}
                      onChange={e => setForm({ ...form, clientesText: e.target.value })}
                    />
                  </div>
                )}
                <button type="submit" className={`btn full ${editingRuta ? 'warn' : 'primary'}`}>
                  {editingRuta ? 'Actualizar ruta' : 'Guardar ruta'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Directorio de Rutas de Entrega</h3>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '450px', justifyContent: 'flex-end' }}>
            <input
              type="text"
              className="input full"
              placeholder="🔍 Buscar ruta, día o vendedor..."
              value={searchRuta}
              onChange={e => setSearchRuta(e.target.value)}
              style={{ flex: 1, minWidth: '180px' }}
            />
            <button className="btn success" onClick={handleOpenAdd}>+ Nueva Ruta</button>
          </div>
        </div>
        <div className="card-b list">
          {filteredRutas.map(r => (
            <div className={'item ' + (selectedRuta === r.id ? 'active' : '')} key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div
                style={{ flex: 1, minWidth: '220px', cursor: 'pointer' }}
                onClick={() => {
                  if (setSelectedRuta) setSelectedRuta(r.id);
                  if (setSelectedCliente && r.clientes?.[0]?.id) setSelectedCliente(r.clientes[0].id);
                }}
              >
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '16px' }}>{r.name}</b>
                  <span className="chip ok">{r.dayOfWeek}</span>
                </div>
                <div className="muted" style={{ marginTop: '4px' }}>
                  🏢 <b>Sucursal:</b> {sucursal(r.branchId)?.name || 'Sin asignar'} &nbsp;·&nbsp; 👤 <b>Vendedor/Chofer:</b> {vendedor(r.driverId)?.name || 'Sin asignar'}
                </div>
                <div className="muted" style={{ marginTop: '2px', fontSize: '12px' }}>
                  👥 <b>Clientes asignados:</b> {(r.clientes || []).length} clientes en esta ruta
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={async () => {
                    const token = localStorage.getItem('ht_token');
                    try {
                      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/loading-sheet/${r.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (res.ok) {
                        const items = await res.json();
                        if (items.length === 0) return alert('No hay pedidos pendientes para esta ruta.');
                        const text = items.map(i => `${i.sku} - ${i.name}: ${i.totalQuantity} pzas`).join('\n');
                        alert(`📋 HOJA DE CARGA CONSOLIDADA - ${r.name.toUpperCase()}\n\n${text}`);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  📋 Hoja de Carga
                </button>
                <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleOpenEdit(r)}>
                  ✏️ Editar
                </button>
              </div>
            </div>
          ))}
          {filteredRutas.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '30px' }}>
              No se encontraron rutas registradas con el término de búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

