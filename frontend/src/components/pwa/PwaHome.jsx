/* eslint-disable react/react-in-jsx-scope */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function PwaHome({ user, route, clients, data }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('day');
  const [randomDays] = useState(() => Math.floor(Math.random() * 10) + 1);

  // Helper para inicio de semana (Lunes)
  const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay() || 7; // 1-7 (Lunes-Domingo)
    if (day !== 1) now.setHours(-24 * (day - 1));
    now.setHours(0, 0, 0, 0);
    return now;
  };

  const isCurrentDay = (d) => new Date(d).toDateString() === new Date().toDateString();
  const isCurrentWeek = (d) => new Date(d) >= getStartOfWeek();

  const offlineOrders = JSON.parse(localStorage.getItem('ht_offline_orders') || '[]').filter(p => p.routeId === route?.id);
  
  const allOrders = [
    ...(data.pedidos || []).filter(p => p.routeId === route?.id),
    ...offlineOrders
  ];

  const filteredOrders = allOrders.filter(p => {
    const d = p.createdAt || new Date();
    return timeRange === 'day' ? isCurrentDay(d) : isCurrentWeek(d);
  });

  const currentSales = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
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

      <div className="pwa-metrics-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.2)', padding: '4px', borderRadius: '8px' }}>
          <button 
            style={{ border: 'none', background: timeRange === 'day' ? '#fff' : 'transparent', color: timeRange === 'day' ? '#d81921' : '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
            onClick={() => setTimeRange('day')}
          >Día</button>
          <button 
            style={{ border: 'none', background: timeRange === 'week' ? '#fff' : 'transparent', color: timeRange === 'week' ? '#d81921' : '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
            onClick={() => setTimeRange('week')}
          >Semana</button>
        </div>
        
        <div className="pwa-metrics-subtitle">Resumen {timeRange === 'day' ? 'del día' : 'de la semana'}</div>
        <div className="pwa-metrics-value">${currentSales.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
        <div style={{fontSize: '0.9rem', opacity: 0.9}}>Venta levantada {timeRange === 'day' ? 'hoy' : 'esta semana'}</div>

        <div className="pwa-metrics-grid">
          <div className="pwa-metrics-item">
            <strong>{filteredOrders.length}</strong>
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
                <span>Última compra: hace {randomDays} días</span>
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
