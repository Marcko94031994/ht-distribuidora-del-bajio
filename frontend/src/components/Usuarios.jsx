import React, { useState, useEffect } from 'react';
import SearchableSelect from './SearchableSelect';

const MODULES = [
  { id: 'dashboard', label: 'Resumen (Dashboard)', group: 'Dashboards' },
  { id: 'torre', label: 'Torre de Control', group: 'Dashboards' },
  { id: 'reportes', label: 'Reportes Gerenciales', group: 'Dashboards' },
  { id: 'sucursales', label: 'Sucursales / Almacenes', group: 'Catálogos' },
  { id: 'rutas', label: 'Rutas / Vendedores', group: 'Catálogos' },
  { id: 'clientes', label: 'Clientes', group: 'Catálogos' },
  { id: 'proveedores', label: 'Proveedores', group: 'Catálogos' },
  { id: 'productos', label: 'Productos', group: 'Catálogos' },
  { id: 'cxp/antiguedad', label: 'Antigüedad de Saldos (CxP)', group: 'Cuentas por Pagar (CxP)' },
  { id: 'cxp/pagos', label: 'Pago a Proveedores (CxP)', group: 'Cuentas por Pagar (CxP)' },
  { id: 'almacen', label: 'Compras e Inventario', group: 'Inventario' },
  { id: 'remisiones', label: 'Remisiones (Despacho)', group: 'Inventario' },
  { id: 'masivos', label: 'Cambios Masivos', group: 'Inventario' },
  { id: 'vendedor', label: 'App Vendedor', group: 'Ventas' },
  { id: 'tienda', label: 'Tienda B2B', group: 'Ventas' },
  { id: 'facturacion', label: 'Facturación SAT', group: 'Finanzas' },
  { id: 'cobranza', label: 'Cobranza / CxC', group: 'Finanzas' },
  { id: 'liquidacion', label: 'Liquidación', group: 'Finanzas' },
  { id: 'caja', label: 'Corte de Caja', group: 'Finanzas' },
  { id: 'usuarios', label: 'Usuarios / Permisos', group: 'Administración' }
];

const DEFAULT_ROLE_PERMS = {
  'Admin': MODULES.map(m => m.id),
  'Almacenista': ['remisiones','almacen','productos','masivos'],
  'Vendedor': ['dashboard','vendedor','clientes'],
  'Chofer': ['rutas','remisiones'],
  'Cliente': ['tienda']
};

export default function Usuarios({ data, addUser, updateUser }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [role, setRole] = useState('Vendedor');
  const [clientId, setClientId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (editing) {
      setRole(editing.role || 'Vendedor');
      setClientId(editing.clientId || '');
      setSelectedPerms(editing.permissions ? editing.permissions.split(',') : (DEFAULT_ROLE_PERMS[editing.role] || []));
    } else {
      setRole('Vendedor');
      setClientId('');
      setSelectedPerms(DEFAULT_ROLE_PERMS['Vendedor']);
    }
  }, [editing]);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    // Auto-fill perms for role if not editing (or even if editing, to reset)
    setSelectedPerms(DEFAULT_ROLE_PERMS[newRole] || []);
  };

  const togglePerm = (id) => {
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      email: f.get('email'),
      role: role,
      permissions: selectedPerms.join(','),
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
    e.target.reset();
    setShowForm(false);
  };

  const startEdit = (u) => {
    setEditing(u);
    setActiveTab('basic');
    setShowForm(true);
  };

  const startNew = () => {
    setEditing(null);
    setRole('Vendedor');
    setSelectedPerms(DEFAULT_ROLE_PERMS['Vendedor']);
    setActiveTab('basic');
    setShowForm(true);
  };

  const groupedModules = MODULES.reduce((acc, m) => {
    acc[m.group] = acc[m.group] || [];
    acc[m.group].push(m);
    return acc;
  }, {});

  const filteredUsuarios = (data.usuarios || []).filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const branchName = data.sucursales?.find(s => s.id === u.sucursalId)?.name || '';
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      branchName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="view-container animate-fade-in">
      <div className="glass" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>👥 Gestión de Usuarios y Permisos</h2>
          <p className="muted" style={{ margin: 0 }}>Controla acceso granular a cada módulo por usuario.</p>
        </div>
      </div>

      {showForm ? (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{editing ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h3>
            <button className="btn secondary" onClick={() => { setEditing(null); setShowForm(false); }}>Cancelar</button>
          </div>
          <div className="card-b">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <button 
                type="button"
                className={`btn ${activeTab === 'basic' ? 'primary' : 'secondary'}`} 
                onClick={() => setActiveTab('basic')}
              >
                Información Básica
              </button>
              <button 
                type="button"
                className={`btn ${activeTab === 'perms' ? 'primary' : 'secondary'}`} 
                onClick={() => setActiveTab('perms')}
              >
                Permisos (ACL)
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {activeTab === 'basic' && (
                <>
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input name="name" className="input full" defaultValue={editing?.name} required />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico (Login) *</label>
                    <input name="email" type="email" className="input full" defaultValue={editing?.email} required />
                  </div>
                  <div className="form-group">
                    <label>Contraseña {editing && '(Dejar en blanco para conservar)'}</label>
                    <input name="password" type="password" className="input full" placeholder={editing ? '••••••••' : 'Mínimo 6 caracteres'} required={!editing} />
                  </div>
                  <div className="form-group">
                    <label>Rol / Perfil Base *</label>
                    <select 
                      className="select full" 
                      value={role} 
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setRole(newRole);
                        if (DEFAULT_ROLE_PERMS[newRole]) {
                          setSelectedPerms(DEFAULT_ROLE_PERMS[newRole]);
                        }
                      }}
                    >
                      <option value="Admin">Administrador General (Todo el sistema)</option>
                      <option value="Ventas">Ventas / Mostrador / Caja</option>
                      <option value="Vendedor">Vendedor de Ruta (App móvil)</option>
                      <option value="Almacen">Almacenista / Logística</option>
                      <option value="Auditor">Auditor (Solo lectura)</option>
                      <option value="Cliente">Portal Clientes (B2B)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sucursal Asignada</label>
                    <SearchableSelect
                      options={data.sucursales || []}
                      value={editing?.sucursalId || ''}
                      name="sucursalId"
                      getOptionLabel={s => `${s.name} (${s.zone})`}
                      getOptionValue={s => s.id}
                      placeholder="Seleccionar sucursal..."
                    />
                  </div>
                </>
              )}

              {activeTab === 'perms' && (
                <div>
                  <p className="muted" style={{ fontSize: '13px', marginBottom: '15px' }}>
                    Personaliza los accesos específicos para este usuario. Las casillas marcadas habilitan el módulo correspondiente en el menú.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {Object.entries(groupedModules).map(([group, mods]) => (
                      <div key={group} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
                          {group}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {mods.map(m => (
                            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedPerms.includes(m.id)} 
                                onChange={() => togglePerm(m.id)}
                              />
                              <span>{m.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn success" style={{flex: 1}}>{editing ? '💾 Guardar Cambios' : '✅ Crear Usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Directorio de Usuarios y Accesos</h3>
            <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '400px' }}>
              <input 
                type="text" 
                className="input full" 
                placeholder="🔍 Buscar usuario, email o rol..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button className="btn success" onClick={startNew}>+ Nuevo Usuario</button>
            </div>
          </div>
          <div className="card-b">
            <table className="table full">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol (Perfil)</th>
                  <th>Accesos</th>
                  <th>Sucursal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map(u => {
                  const permsArr = u.permissions ? u.permissions.split(',') : [];
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`chip ${u.role === 'Admin' ? 'primary' : 'secondary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {permsArr.length} módulos permitidos
                      </td>
                      <td>{data.sucursales?.find(s => s.id === u.sucursalId)?.name || 'N/A'}</td>
                      <td>
                        <button className="btn secondary small" onClick={() => startEdit(u)}>✏️ Editar</button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsuarios.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }} className="muted">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
