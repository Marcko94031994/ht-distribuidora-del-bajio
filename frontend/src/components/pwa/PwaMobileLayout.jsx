import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './pwa-styles.css';

import PwaHome from './PwaHome';
import PwaClientDetails from './PwaClientDetails';
import PwaCatalog from './PwaCatalog';
import PwaCart from './PwaCart';
import PwaSuccess from './PwaSuccess';

function PwaMobileLayout({ data, reloadState, user, sucursal, producto }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // PWA Cart state
  const [pwaCart, setPwaCart] = useState(() => {
    try {
      const saved = localStorage.getItem('ht_pwa_cart');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const saveCart = (newCart) => {
    setPwaCart(newCart);
    localStorage.setItem('ht_pwa_cart', JSON.stringify(newCart));
  };

  const currentTab = location.pathname.includes('/clientes') ? 'clientes' : 
                     location.pathname.includes('/productos') ? 'productos' : 
                     location.pathname.includes('/mas') ? 'mas' : 'inicio';

  // Get current assigned route for the user
  const allRoutes = data.rutas || [];
  const assignedRoute = allRoutes.find(r => r.driverId === user.id) || allRoutes[0];
  const clients = assignedRoute?.clientes || [];

  return (
    <div className="pwa-mobile-container">
      <Routes>
        <Route path="/" element={<PwaHome user={user} route={assignedRoute} clients={clients} data={data} />} />
        <Route path="/cliente/:id" element={<PwaClientDetails clients={clients} data={data} user={user} />} />
        <Route path="/cliente/:id/catalogo" element={<PwaCatalog clients={clients} data={data} cart={pwaCart} setCart={saveCart} producto={producto} />} />
        <Route path="/carrito/:clientId" element={<PwaCart clients={clients} cart={pwaCart} setCart={saveCart} data={data} user={user} route={assignedRoute} reloadState={reloadState} />} />
        <Route path="/exito/:orderId" element={<PwaSuccess />} />
      </Routes>

      {/* Bottom Navigation */}
      {!location.pathname.includes('/carrito') && !location.pathname.includes('/exito') && (
        <div className="pwa-bottom-nav">
          <button className={`pwa-nav-item ${currentTab === 'inicio' ? 'active' : ''}`} onClick={() => navigate('/pwa')}>
            <span className="pwa-nav-icon">🏠</span>
            <span>Inicio</span>
          </button>
          <button className={`pwa-nav-item ${currentTab === 'clientes' ? 'active' : ''}`} onClick={() => navigate('/pwa')}>
            <span className="pwa-nav-icon">👤</span>
            <span>Clientes</span>
          </button>
          <button className={`pwa-nav-item ${currentTab === 'productos' ? 'active' : ''}`}>
            <span className="pwa-nav-icon">📦</span>
            <span>Productos</span>
          </button>
          <button className={`pwa-nav-item ${currentTab === 'mas' ? 'active' : ''}`} onClick={() => {
            if(window.confirm('¿Deseas salir al panel de administración?')) {
              navigate('/');
            }
          }}>
            <span className="pwa-nav-icon">☰</span>
            <span>Más</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default PwaMobileLayout;
