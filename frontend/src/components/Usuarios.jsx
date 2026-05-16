import React, { useState } from 'react';

export default function Usuarios({ data, addUser, updateUser }) {
  const [editing, setEditing] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      email: f.get('email'),
      role: f.get('role'),
      sucursalId: f.get('sucursalId') ? Number(f.get('sucursalId')) : null,
      clientId: f.get('clientId') ? Number(f.get('clientId')) : null,
      password: f.get('password') || null
    };

    if (editing) {
      updateUser(editing.id, payload);
      setEditing(null);
    } else {
      addUser(payload);
    }
    e.currentTarget.reset();
  };

  return (
    <div className="view-container animate-fade-in">
      <div className="glass" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>👥 Gestión de Usuarios y Permisos</h2>
        <p className="muted">Controla quién tiene acceso a cada módulo del sistema.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
        {/* Tabla de Usuarios */}
        <div className="glass" style={{ padding: '20px', borderRadius: '24px' }}>
          <table className="table full">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol / Permisos</th>
                <th>Sucursal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.usuarios?.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`chip ${u.role === 'Admin' ? 'primary' : 'secondary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{data.sucursales?.find(s => s.id === u.sucursalId)?.name || 'N/A'}</td>
                  <td>
                    <button className="btn secondary small" onClick={() => setEditing(u)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Formulario Alta/Edición */}
        <div className="glass" style={{ padding: '20px', borderRadius: '24px', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>{editing ? '📝 Editar Usuario' : '➕ Nuevo Usuario'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input name="name" className="input full" defaultValue={editing?.name} required />
            </div>
            <div className="form-group">
              <label>Email (Usuario)</label>
              <input name="email" type="email" className="input full" defaultValue={editing?.email} required />
            </div>
            <div className="form-group">
              <label>Contraseña {editing && '(dejar vacío para no cambiar)'}</label>
              <input name="password" type="password" className="input full" required={!editing} />
            </div>
            <div className="form-group">
              <label>Rol de Sistema</label>
              <select name="role" className="input full" defaultValue={editing?.role || 'Vendedor'}>
                <option value="Admin">Administrador (Acceso Total)</option>
                <option value="Vendedor">Vendedor (App de Campo)</option>
                <option value="Almacenista">Almacenista (Compras/Stock)</option>
                <option value="Chofer">Chofer (Remisiones/Entregas)</option>
                <option value="Cliente">Cliente (Portal B2B)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sucursal Asignada</label>
              <select name="sucursalId" className="input full" defaultValue={editing?.sucursalId || ''}>
                <option value="">Todas / Corporativo</option>
                {data.sucursales?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Vincular a Cliente (Solo para rol Cliente)</label>
              <select name="clientId" className="input full" defaultValue={editing?.clientId || ''}>
                <option value="">Ninguno</option>
                {data.rutas?.flatMap(r => r.clients).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn primary full">{editing ? 'Guardar Cambios' : 'Crear Usuario'}</button>
              {editing && <button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancelar</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
