import { useState, useEffect } from 'react';
import SearchableSelect from './SearchableSelect';

const MODULES_BY_GROUP = {
  'DASHBOARDS Y REPORTES': [
    { id: 'dashboard', label: 'Resumen (Dashboard)' },
    { id: 'torre', label: 'Torre de Control' },
    { id: 'reportes', label: 'Reportes Gerenciales' }
  ],
  'CATÁLOGOS': [
    { id: 'sucursales', label: 'Sucursales' },
    { id: 'almacenes', label: 'Almacenes y Racks' },
    { id: 'vendedores', label: 'Vendedores / Choferes' },
    { id: 'rutas', label: 'Rutas de Entrega' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'proveedores', label: 'Proveedores' },
    { id: 'productos', label: 'Productos' },
    { id: 'precios', label: 'Lista de Precios y Costos' },
    { id: 'vehiculos', label: 'Vehículos y Unidades' }
  ],
  'CUENTAS POR PAGAR (CXP)': [
    { id: 'cxp/antiguedad', label: 'Antigüedad de Saldos (CxP)' },
    { id: 'cxp/pagos', label: 'Pago a Proveedores (CxP)' }
  ],
  'INVENTARIO Y LOGÍSTICA': [
    { id: 'almacen/stock', label: 'Existencias (Stock)' },
    { id: 'almacen/kardex', label: 'Movimientos (Kardex)' },
    { id: 'almacen/ajustes', label: 'Ajustes de Inventario' },
    { id: 'almacen/devoluciones', label: 'Devoluciones' },
    { id: 'ordenes', label: 'Órdenes de Compra' },
    { id: 'mermas', label: 'Mermas y Caducados' }
  ],
  'VENTAS': [
    { id: 'vendedor', label: 'App Vendedor' },
    { id: 'tienda', label: 'Tienda B2B (Portal)' },
    { id: 'ventas/surtido', label: 'Pedidos Pendientes de Surtir' },
    { id: 'remisiones', label: 'Remisiones (Despacho)' }
  ],
  'FINANZAS': [
    { id: 'cobranza', label: 'Cuentas por Cobrar (CxC)' },
    { id: 'liquidacion', label: 'Liquidación' },
    { id: 'caja', label: 'Corte de Caja' }
  ],
  'CFDI FACTURACIÓN': [
    { id: 'cfdi/ingresos', label: 'Facturar Ingresos (Pedidos)' },
    { id: 'cfdi/pagos', label: 'Complementos de Pago' },
    { id: 'cfdi/egresos', label: 'Notas de Crédito (Devoluciones)' }
  ],
  'ADMINISTRACIÓN': [
    { id: 'usuarios', label: 'Usuarios y Permisos' }
  ]
};

const DEFAULT_ROLE_PERMS = {
  'Admin': Object.values(MODULES_BY_GROUP).flat().map(m => m.id),
  'Almacenista': ['remisiones', 'almacen/stock', 'almacen/kardex', 'productos'],
  'Vendedor': ['dashboard', 'vendedor', 'clientes'],
  'Chofer': ['rutas', 'remisiones'],
  'Cliente': ['tienda']
};

export default function Usuarios({ data, addUser, updateUser }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [role, setRole] = useState('Vendedor');
  const [clientId, setClientId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (editing) {
      setRole(editing.role || 'Vendedor');
      setClientId(editing.clientId || '');
      setDriverId(editing.driverId || '');
      setSelectedPerms(editing.permissions ? editing.permissions.split(',') : (DEFAULT_ROLE_PERMS[editing.role] || []));
    } else {
      setRole('Vendedor');
      setClientId('');
      setDriverId('');
      setSelectedPerms(DEFAULT_ROLE_PERMS['Vendedor']);
    }
    setSuccessMsg('');
  }, [editing]);

  const togglePerm = (id) => {
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
      };

    const handleSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      email: f.get('email')?.trim(),
      role: role,
      permissions: selectedPerms.join(','),
      sucursalId: f.get('sucursalId') ? Number(f.get('sucursalId')) : null,
      clientId: f.get('clientId') ? Number(f.get('clientId')) : null,
      driverId: f.get('driverId') ? Number(f.get('driverId')) : null,
      password: f.get('password') || null
    };

    setSavingPermissions(true);
    setSuccessMsg('');
    try {
      if (editing) {
        await updateUser(editing.id, payload);
      } else {
        await addUser(payload);
      }
      setSuccessMsg('✅ ¡Guardado exitosamente!');
      setTimeout(() => {
        setEditing(null);
        e.target.reset();
        setShowForm(false);
        setSavingPermissions(false);
      }, 1500);
    } catch (e) {
      alert('Error al guardar: ' + e.message);
      setSavingPermissions(false);
    }
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
              
              <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input name="name" className="input full" defaultValue={editing?.name} required={activeTab === 'basic'} />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico (Login) *</label>
                    <input name="email" type="email" className="input full" defaultValue={editing?.email} required={activeTab === 'basic'} />
                  </div>
                  <div className="form-group">
                    <label>Contraseña {editing && '(Dejar en blanco para conservar)'}</label>
                    <input name="password" type="password" className="input full" placeholder={editing ? '••••••••' : 'Mínimo 6 caracteres'} required={!editing && activeTab === 'basic'} />
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
                      <option value="Admin">Admin (Todos los permisos)</option>
                      <option value="Vendedor">Vendedor (App)</option>
                      <option value="Almacenista">Almacenista / Despacho</option>
                      <option value="Chofer">Chofer / Repartidor</option>
                      <option value="Cliente">Cliente B2B</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Asignar a Sucursal (Opcional)</label>
                    <SearchableSelect 
                      options={(data.sucursales || []).map(s => ({ value: s.id, label: s.name }))}
                      value={editing?.sucursalId || ''}
                      name="sucursalId"
                    />
                  </div>
                  
                  {role === 'Vendedor' && (
                  <div className="form-group">
                    <label>Enlazar a Vendedor / Chofer *</label>
                    <SearchableSelect 
                      options={(data.vendedores || []).map(v => ({ value: v.id, label: `${v.name} (${v.phone || 'Sin tel'})` }))}
                      value={driverId}
                      onChange={(val) => setDriverId(val)}
                      name="driverId"
                    />
                  </div>
                  )}
                  <button type="submit" disabled={savingPermissions || successMsg} className={`btn full ${successMsg ? 'success' : (editing ? 'warn' : 'primary')}`} style={{ padding: '12px', marginTop: '10px' }}>
                    {successMsg ? '✅ ¡Guardado exitosamente!' : (savingPermissions ? '⏳ Guardando...' : (editing ? '📝 Actualizar Usuario' : '💾 Guardar Usuario'))}
                  </button>
              </div>

              <div style={{ display: activeTab === 'perms' ? 'block' : 'none' }}>
                  <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
                    Personaliza los accesos específicos para este usuario. Las casillas marcadas habilitan el módulo correspondiente en el menú.
                  </p>
                  {successMsg && (
                    <div style={{ marginBottom: '16px', padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>
                      ✅ {successMsg}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {Object.entries(MODULES_BY_GROUP).map(([group, mods]) => (
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
                  <button 
                    type="submit" 
                    className="btn primary" 
                    style={{ width: '100%', padding: '12px', marginTop: '20px' }}
                    disabled={savingPermissions}
                  >
                    {savingPermissions ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                  </button>
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
