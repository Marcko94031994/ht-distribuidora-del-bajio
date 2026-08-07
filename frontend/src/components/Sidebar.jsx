import { useState, useEffect } from 'react';
import { useDeviceMode } from '../utils/useDeviceMode';

// Crisp SVG outline icons matching modern dashboard aesthetic
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  torre: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/>
    </svg>
  ),
  reportes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  sucursales: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="9" y1="17" x2="9" y2="17.01"/>
    </svg>
  ),
  almacenes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  ),
  vendedores: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  rutas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  clientes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  proveedores: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    </svg>
  ),
  productos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  precios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>
    </svg>
  ),
  vehiculos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  almacen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  ordenes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>
    </svg>
  ),
  remisiones: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  mermas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  masivos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
    </svg>
  ),
  vendedor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  ),
  tienda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>
    </svg>
  ),
  facturacion: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>
    </svg>
  ),
  cobranza: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  cxp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="12" y1="14" x2="12" y2="17"/><polyline points="10 15.5 12 14 14 15.5"/>
    </svg>
  ),
  'cxp/pagos': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="12" r="2"/><path d="m14 10 4 4m0-4-4 4"/>
    </svg>
  ),
  'cxp/antiguedad': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20v-6M6 20V10M18 20V4"/>
    </svg>
  ),
  'cxp/estado-cuenta': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  liquidacion: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  caja: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="9" x2="12" y2="15"/>
    </svg>
  ),
  usuarios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
};

export default function Sidebar({tab,setTab,user,sucursal,logout}){
  const { isMobile, isPWA } = useDeviceMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuGroups = [
    {
      title: 'Dashboards y Reportes',
      items: [
        ['dashboard','Resumen', ['Admin', 'Vendedor']],
        ['torre','Torre de Control', ['Admin']],
        ['reportes','Reportes Gerenciales', ['Admin']]
      ]
    },
    {
      title: 'Catálogos',
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
      title: 'Cuentas por Pagar (CxP)',
      items: [
        ['cxp/antiguedad', 'Antigüedad de Saldos', ['Admin']],
        ['cxp/pagos', 'Pago a Proveedores', ['Admin']]
      ]
    },
    {
      title: 'Inventario y Logística',
      items: [
        ['almacen','Kardex / Inventario', ['Admin', 'Almacenista']],
        ['ordenes', 'Órdenes de Compra', ['Admin', 'Almacenista']],
        ['remisiones','Remisiones (Despacho)', ['Admin', 'Chofer', 'Almacenista']],
        ['mermas','Mermas y Caducados', ['Admin', 'Almacenista']],
        ['masivos','Cambios Masivos', ['Admin', 'Almacenista']]
      ]
    },
    {
      title: 'Ventas y Finanzas',
      items: [
        ['vendedor','App Vendedor', ['Admin', 'Vendedor']],
        ['tienda','Tienda B2B (Portal)', ['Admin', 'Cliente']],
        ['facturacion','Facturación SAT', ['Admin']],
        ['cobranza','Cuentas por Cobrar (CxC)', ['Admin']],
        ['liquidacion','Liquidación', ['Admin']],
        ['caja','Corte de Caja', ['Admin']]
      ]
    },
    {
      title: 'Administración',
      items: [
        ['usuarios','Usuarios y Permisos', ['Admin']]
      ]
    }
  ];

  // Default all groups open or auto-open
  const [openGroups, setOpenGroups] = useState({
    'Dashboards y Reportes': true,
    'Catálogos': true,
    'Inventario y Logística': true,
    'Cuentas por Pagar (CxP)': true,
    'Ventas y Finanzas': true,
    'Administración': true
  });

  useEffect(() => {
    const activeGroup = menuGroups.find(g => g.items.some(i => i[0] === tab || (tab.startsWith('cxp') && i[0].startsWith('cxp'))));
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.title]: true }));
    }
  }, [tab]);

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleSelectTab = (t) => {
    setTab(t);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const userRole = user?.role || 'Admin';

  const renderNavContent = () => (
    <>
      <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        {menuGroups.map(group => {
          const permissionsStr = user?.permissions || '';
          
          const visibleItems = group.items.filter(t => {
             if (userRole === 'Admin') return true; 
             const baseKey = t[0].split('/')[0];
             return permissionsStr.includes(t[0]) || permissionsStr.includes(baseKey);
          });
          
          if (visibleItems.length === 0) return null;

          const isOpen = !!openGroups[group.title];

          return (
            <div className="sidebar-group" key={group.title}>
              <div 
                className="sidebar-group-title" 
                onClick={() => toggleGroup(group.title)}
              >
                <span>{isOpen ? '− ' : '+ '}{group.title}</span>
                <span className="chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  ▶
                </span>
              </div>
              
              <div className="sidebar-group-content" style={{ display: isOpen ? 'flex' : 'none' }}>
                {visibleItems.map(t => {
                  const isActive = tab === t[0] || (tab === 'cxp' && t[0] === 'cxp/antiguedad');
                  const icon = Icons[t[0]] || Icons[t[0].split('/')[0]] || Icons.dashboard;
                  return (
                    <button 
                      key={t[0]} 
                      className={`sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectTab(t[0])}
                    >
                      {icon}
                      <span>{t[1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer User Info & Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">
            {(user?.email || 'AD').substring(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <b className="truncate" title={user?.email || 'Usuario'}>{user?.email || 'admin@htdistribuidora.mx'}</b>
            <div className="muted truncate" title={sucursal?.name || 'Central'}>
              {user?.role || 'Administrador'} · {sucursal?.name || 'Central'}
            </div>
          </div>
        </div>
        <button 
          className="btn secondary full-width" 
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 12px', fontSize: '12.5px', fontWeight: 600, borderRadius: '8px' }}
        >
          {Icons.logout}
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      {isMobile ? (
        <div style={{
          width: '100%',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Abrir Menú"
            >
              ☰
            </button>
            <img 
              src="/logo.png" 
              alt="HT" 
              style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline-block';
              }}
            />
            <span style={{ display: 'none', fontWeight: 900, fontSize: '14px', color: '#d81921' }}>HT DISTRIBUIDORA</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px' }}>
              {user?.role || 'Vendedor'}
            </span>
            <button 
              onClick={logout} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
              title="Cerrar Sesión"
            >
              {Icons.logout}
            </button>
          </div>
        </div>
      ) : null}

      {/* Mobile Drawer Overlay */}
      {isMobile && mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1050,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Drawer Container (Mobile or Desktop) */}
      <div className={`sidebar ${isMobile ? 'mobile-drawer' : ''}`} style={isMobile ? {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        zIndex: 1100,
        background: '#ffffff',
        boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column'
      } : {}}>
        {/* Sidebar Header with Brand Logo */}
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <img 
              src="/logo.png" 
              alt="HT Distribuidora del Bajío" 
              className="brand-logo-img"
              style={{ height: '54px', maxWidth: '190px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="brand-fallback" style={{ display: 'none', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '-0.05em'
              }}>
                <span style={{ color: '#d81921' }}>H</span>
                <span style={{ color: '#111111' }}>T</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>HT DISTRIBUIDORA</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#d81921', letterSpacing: '0.04em' }}>DEL BAJÍO</span>
              </div>
            </div>
          </div>
          {isMobile && (
            <button 
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer', padding: '6px' }}
            >
              ✕
            </button>
          )}
        </div>
        
        {renderNavContent()}
      </div>
    </>
  );
}
