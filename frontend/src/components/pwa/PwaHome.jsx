import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PwaHome({ user, route, clients, data }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Calculations for metrics
  const todayOrders = (data.pedidos || []).filter(p => p.routeId === route?.id && new Date(p.createdAt || new Date()).toDateString() === new Date().toDateString());
  const todaySales = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  const overdueClients = clients.filter(c => (c.overdueBalance || 0) > 0);

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id?.toString().includes(searchTerm)
  );

  return (
    <div>
      <div className="pwa-header">
        <div className="pwa-header-subtitle">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long' })} · {route?.name || 'Sin ruta asignada'}
        </div>
        <div className="pwa-header-title">
          Hola, {user?.name?.split(' ')[0] || 'Vendedor'} 👋
        </div>
      </div>

      <div className="pwa-metrics-card">
        <div className="pwa-metrics-subtitle">Resumen del día</div>
        <div className="pwa-metrics-value">${todaySales.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
        <div style={{fontSize: '0.9rem', opacity: 0.9}}>Venta levantada hoy</div>

        <div className="pwa-metrics-grid">
          <div className="pwa-metrics-item">
            <strong>{todayOrders.length}</strong>
            <span>Pedidos</span>
          </div>
          <div className="pwa-metrics-item">
            <strong>{clients.length}</strong>
            <span>Clientes</span>
          </div>
          <div className="pwa-metrics-item">
            <strong>{overdueClients.length}</strong>
            <span>Vencidos</span>
          </div>
        </div>
      </div>

      <div className="pwa-section-title">Selecciona el cliente</div>

      <div className="pwa-search-container">
        <input 
          type="text" 
          className="pwa-search-input" 
          placeholder="Buscar por nombre, RFC o código..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="pwa-list">
        {filteredClients.map(c => {
          const isOverdue = (c.overdueBalance || 0) > 0;
          const isCredit = (c.creditLimit || 0) > 0;
          
          return (
            <div className="pwa-card" key={c.id} onClick={() => navigate(`/pwa/cliente/${c.id}`)}>
              <div className="pwa-card-row">
                <div>
                  <div className="pwa-card-title">{c.name}</div>
                  <div className="pwa-card-subtitle">CLI-{c.id.toString().padStart(5, '0')} · {c.zone || 'León, Gto.'}</div>
                </div>
                <div>
                  {isOverdue ? (
                    <span className="pwa-pill danger">Saldo vencido</span>
                  ) : isCredit ? (
                    <span className="pwa-pill warning">Crédito</span>
                  ) : (
                    <span className="pwa-pill success">Al corriente</span>
                  )}
                </div>
              </div>
              <div className="pwa-card-footer">
                <span>Última compra: hace {Math.floor(Math.random() * 10) + 1} días</span>
                <span className="pwa-card-action">Ver cliente →</span>
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div style={{textAlign: 'center', color: '#78685e', padding: '20px'}}>
            No se encontraron clientes.
          </div>
        )}
      </div>
    </div>
  );
}

export default PwaHome;
