export default function Sidebar({tab,setTab,user,sucursal,logout}){
  const allTabs=[
    ['dashboard','Resumen', ['Admin', 'Vendedor']],
    ['torre','Torre de Control', ['Admin']],
    ['reportes','Reportes Gerenciales', ['Admin']],
    ['sucursales','Sucursales / Almacenes', ['Admin']],
    ['rutas','Rutas / Vendedores', ['Admin', 'Chofer']],
    ['vendedor','App Vendedor', ['Admin', 'Vendedor']],
    ['remisiones','Remisiones', ['Admin', 'Chofer', 'Almacenista']],
    ['almacen','Compras / Inventario', ['Admin', 'Almacenista']],
    ['productos','Productos', ['Admin', 'Almacenista']],
    ['masivos','Cambios Masivos', ['Admin', 'Almacenista']],
    ['clientes','Clientes', ['Admin', 'Vendedor']],
    ['cobranza','Cobranza / CxC', ['Admin']],
    ['facturacion','Facturación SAT', ['Admin']],
    ['proveedores','Proveedores', ['Admin']],
    ['usuarios','Usuarios / Permisos', ['Admin']],
    ['liquidacion','Liquidación', ['Admin']],
    ['caja','Corte de Caja', ['Admin']],
    ['tienda','Tienda B2B (Portal)', ['Admin', 'Cliente']]
  ];

  const visibleTabs = allTabs.filter(t => t[2].includes(user.role || 'Admin'));

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">HT</div>
          <div className="brand-text">
            <span className="brand-title">HT DISTRIBUIDORA</span>
            <span className="brand-subtitle">del BAJÍO</span>
          </div>
        </div>
      </div>
      
      <div className="sidebar-nav">
        {visibleTabs.map(t=>(
          <button 
            key={t[0]} 
            className={'sidebar-item '+(tab===t[0]?'active':'')} 
            onClick={()=>setTab(t[0])}
          >
            {t[1]}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{user.email.substring(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <b className="truncate" title={user.email}>{user.email}</b>
            <div className="muted truncate" title={sucursal?.name}>{sucursal?.name || 'Central'}</div>
          </div>
        </div>
        <button className="btn secondary full-width" onClick={logout}>Cerrar Sesión</button>
      </div>
    </div>
  );
}
