export default function Topbar({tab,setTab,user,sucursal,logout}){
  const allTabs=[
    ['dashboard','Resumen', ['Admin', 'Vendedor']],
    ['torre','Torre de Control', ['Admin']],
    ['reportes','Reportes Gerenciales', ['Admin']],
    ['sucursales','Sucursales / almacenes', ['Admin']],
    ['rutas','Rutas / vendedores', ['Admin', 'Chofer']],
    ['vendedor','App vendedor', ['Admin', 'Vendedor']],
    ['remisiones','Remisiones', ['Admin', 'Chofer', 'Almacenista']],
    ['almacen','Compras / inventario', ['Admin', 'Almacenista']],
    ['productos','Productos', ['Admin', 'Almacenista']],
    ['masivos','Cambios Masivos', ['Admin', 'Almacenista']],
    ['clientes','Clientes', ['Admin', 'Vendedor']],
    ['cobranza','Cobranza / CxC', ['Admin']],
    ['facturacion','Facturación SAT', ['Admin']],
    ['proveedores','Proveedores', ['Admin']],
    ['usuarios','Usuarios / Permisos', ['Admin']],
    ['liquidacion','Liquidación', ['Admin']],
    ['tienda','Tienda B2B (Portal)', ['Admin', 'Cliente']]
  ];

  const visibleTabs = allTabs.filter(t => t[2].includes(user.role || 'Admin'));

  return (
    <div className="topbar">
      <div className="brand">
        <div style={{ width: 44, height: 44, background: 'var(--primary)', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: '900', fontSize: '20px' }}>
          HT
          <div style={{ position: 'absolute', bottom: -10, right: -10, width: 25, height: 25, background: 'var(--bg)', transform: 'rotate(45deg)' }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary)' }}>HT DISTRIBUIDORA</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--dark)', marginTop: '2px' }}>del BAJÍO</span>
        </div>
      </div>
      <div className="tabs">
        {visibleTabs.map(t=><button key={t[0]} className={'tab '+(tab===t[0]?'active':'')} onClick={()=>setTab(t[0])}>{t[1]}</button>)}
      </div>
      <div className="sidebar-user">
        <div className="avatar">AC</div>
        <div>
          <b>{user.email}</b>
          <div className="muted">{sucursal?.name}</div>
        </div>
        <button className="btn secondary" onClick={logout}>Salir</button>
      </div>
    </div>
  );
}

