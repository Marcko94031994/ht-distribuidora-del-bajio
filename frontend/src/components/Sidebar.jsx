import { useState, useEffect } from 'react';

export default function Sidebar({tab,setTab,user,sucursal,logout}){
  const menuGroups = [
    {
      title: '📊 Dashboards y Reportes',
      items: [
        ['dashboard','Resumen', ['Admin', 'Vendedor']],
        ['torre','Torre de Control', ['Admin']],
        ['reportes','Reportes Gerenciales', ['Admin']]
      ]
    },
    {
      title: '🏢 Catálogos',
      items: [
        ['sucursales','Sucursales', ['Admin']],
        ['almacenes','Almacenes y Racks', ['Admin', 'Almacenista']],
        ['vendedores','Vendedores / Choferes', ['Admin']],
        ['rutas','Rutas de Entrega', ['Admin', 'Chofer']],
        ['clientes','Clientes', ['Admin', 'Vendedor']],
        ['proveedores','Proveedores', ['Admin']],
        ['productos','Productos', ['Admin', 'Almacenista']],
        ['precios','Lista de Precios y Costos', ['Admin', 'Almacenista']],
        ['vehiculos','Vehículos y Unidades', ['Admin']]
      ]
    },
    {
      title: '📦 Inventario y Logística',
      items: [
        ['almacen','Kardex / Inventario', ['Admin', 'Almacenista']],
        ['ordenes', 'Órdenes de Compra', ['Admin', 'Almacenista']],
        ['remisiones','Remisiones (Despacho)', ['Admin', 'Chofer', 'Almacenista']],
        ['mermas','Mermas y Caducados', ['Admin', 'Almacenista']],
        ['masivos','Cambios Masivos', ['Admin', 'Almacenista']]
      ]
    },
    {
      title: '💰 Ventas y Finanzas',
      items: [
        ['vendedor','App Vendedor', ['Admin', 'Vendedor']],
        ['tienda','Tienda B2B (Portal)', ['Admin', 'Cliente']],
        ['facturacion','Facturación SAT', ['Admin']],
        ['cobranza','Cobranza / CxC', ['Admin']],
        ['liquidacion','Liquidación', ['Admin']],
        ['caja','Corte de Caja', ['Admin']]
      ]
    },
    {
      title: '⚙️ Administración',
      items: [
        ['usuarios','Usuarios y Permisos', ['Admin']]
      ]
    }
  ];

  // Auto-open group that contains the current active tab
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    // Open the group where the active tab is located initially
    const activeGroup = menuGroups.find(g => g.items.some(i => i[0] === tab));
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.title]: true, '📊 Dashboards y Reportes': true }));
    }
  }, []);

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const userRole = user.role || 'Admin';

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
        {menuGroups.map(group => {
          // Filter items by user permissions string (e.g. "dashboard,rutas,vendedor")
          const permissionsStr = user.permissions || '';
          
          const visibleItems = group.items.filter(t => {
             // Admin override or check specific permission
             if (userRole === 'Admin') return true; 
             // Let's use strict permissions:
             return permissionsStr.includes(t[0]);
          });
          
          if (visibleItems.length === 0) return null;

          const isOpen = !!openGroups[group.title];

          return (
            <div className="sidebar-group" key={group.title}>
              <div 
                className="sidebar-group-title" 
                onClick={() => toggleGroup(group.title)}
              >
                <span>{group.title}</span>
                <span className="chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  ▶
                </span>
              </div>
              
              <div className="sidebar-group-content" style={{ display: isOpen ? 'flex' : 'none', flexDirection: 'column' }}>
                {visibleItems.map(t => (
                  <button 
                    key={t[0]} 
                    className={'sidebar-item '+(tab===t[0]?'active':'')} 
                    onClick={()=>setTab(t[0])}
                  >
                    {t[1]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
