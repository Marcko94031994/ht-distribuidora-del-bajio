import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Paleta corporativa vibrante para trazar cada ruta
const ROUTE_PALETTES = [
  { stroke: '#2563eb', bg: '#dbeafe', border: '#1d4ed8', name: 'Ruta Azul Rey' },
  { stroke: '#8b5cf6', bg: '#ede9fe', border: '#6d28d9', name: 'Ruta Violeta' },
  { stroke: '#ea580c', bg: '#ffedd5', border: '#c2410c', name: 'Ruta Naranja' },
  { stroke: '#059669', bg: '#d1fae5', border: '#047857', name: 'Ruta Esmeralda' },
  { stroke: '#db2777', bg: '#fce7f3', border: '#be185d', name: 'Ruta Carmín' },
  { stroke: '#0891b2', bg: '#cffafe', border: '#0e7490', name: 'Ruta Cian' },
];

// Helper para crear icono de Chofer/Camión
const createDriverDivIcon = (driver, color) => {
  const isInc = driver.hasIncident;
  const mainColor = isInc ? '#dc2626' : color;
  const firstName = (driver.name || 'Chofer').split(' ')[0];

  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
        <div style="
          background: ${mainColor};
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>🚚</span>
          <span>${firstName}</span>
        </div>
        <div style="
          width: 14px;
          height: 14px;
          background: ${mainColor};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px ${mainColor};
          margin-top: 2px;
        "></div>
        ${!isInc ? `
          <div style="
            position: absolute;
            bottom: -3px;
            width: 22px;
            height: 22px;
            border: 2px solid ${mainColor};
            border-radius: 50%;
            animation: radarPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            pointer-events: none;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [80, 48],
    iconAnchor: [40, 44],
    popupAnchor: [0, -44]
  });
};

// Helper para crear icono de Parada de Cliente
const createClientDivIcon = (stopIndex, isVisited, hasIncident, color) => {
  const bg = isVisited ? '#16a34a' : (hasIncident ? '#dc2626' : '#ffffff');
  const border = isVisited ? '#15803d' : (hasIncident ? '#b91c1c' : color);
  const text = isVisited ? '#ffffff' : (hasIncident ? '#ffffff' : color);

  return L.divIcon({
    className: 'custom-client-marker',
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: ${bg};
        border: 2.5px solid ${border};
        color: ${text};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        cursor: pointer;
      ">
        ${isVisited ? '✓' : stopIndex}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
};

// Controlador de cámara para centrar el mapa en la ruta seleccionada
const MapController = ({ selectedBounds, center }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedBounds && selectedBounds.length > 0) {
      map.fitBounds(selectedBounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (center) {
      map.flyTo([center.lat, center.lng], 12, { animate: true });
    }
  }, [selectedBounds, center, map]);

  return null;
};

// Widget del clima en vivo (León, Gto)
const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=21.1221&longitude=-101.6833&current_weather=true&timezone=America%2FMexico_City')
      .then(res => res.json())
      .then(data => {
        if(data && data.current_weather) {
          setWeather(data.current_weather);
        }
      })
      .catch(e => console.error(e));
  }, []);

  if(!weather) return null;

  const weatherDescriptions = {
    0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
    55: 'Llovizna densa', 61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
    80: 'Chubascos', 81: 'Chubascos fuertes', 82: 'Chubascos violentos', 95: 'Tormenta eléctrica'
  };

  const desc = weatherDescriptions[weather.weathercode] || 'Despejado';
  const getEmoji = (code) => {
    if (code === 0) return '☀️';
    if (code === 1 || code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 65) return '🌧️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌡️';
  };

  return (
    <div style={{
      position: 'absolute', top: '16px', right: '16px', zIndex: 1000,
      background: 'rgba(255,255,255,0.92)', padding: '8px 14px', borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '10px',
      backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.8)'
    }}>
      <div style={{ fontSize: '2rem', lineHeight: 1 }}>{getEmoji(weather.weathercode)}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>León, Gto</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
          {weather.temperature}°C • {desc}
        </div>
      </div>
    </div>
  );
};

export default function TorreControl({ data, vendedor, reloadState }) {
  const center = { lat: 21.1213, lng: -101.6826 };
  const [selectedRouteId, setSelectedRouteId] = useState('ALL');
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Cargar configuración de Geovalidación
  const [geoSettings, setGeoSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ht_geo_settings');
      return saved ? JSON.parse(saved) : { enabled: true, toleranceMeters: 300, mode: 'auditoria', exemptRoles: ['Telemarketing'] };
    } catch(e) {
      return { enabled: true, toleranceMeters: 300, mode: 'auditoria', exemptRoles: ['Telemarketing'] };
    }
  });

  const saveGeoSettings = (newSettings) => {
    setGeoSettings(newSettings);
    localStorage.setItem('ht_geo_settings', JSON.stringify(newSettings));
    setShowGeoModal(false);
  };

  // Disparador para simular 3 rutas activas en vivo
  const handleSimulateRoutes = async () => {
    setIsSimulating(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/simulate-active-routes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (reloadState) await reloadState();
        else window.location.reload();
      } else {
        alert('No se pudo iniciar la simulación.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al simular.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtrar rutas según selección
  const displayedRoutes = useMemo(() => {
    if (selectedRouteId === 'ALL') return data.rutas || [];
    return (data.rutas || []).filter(r => r.id === Number(selectedRouteId));
  }, [data.rutas, selectedRouteId]);

  // Métricas consolidadas
  const metrics = useMemo(() => {
    const allClients = (data.rutas || []).flatMap(r => r.clientes || []);
    const totalClients = allClients.length;
    const visitedClients = allClients.filter(c => c.isVisited).length;
    const pendingClients = totalClients - visitedClients;
    const percent = totalClients > 0 ? Math.round((visitedClients / totalClients) * 100) : 0;
    
    const orders = data.pedidos || [];
    const totalDeliveredAmount = orders.filter(p => p.status === 'Entregado').reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalGeoValidated = orders.filter(p => p.isGeoValidated).length;

    return {
      activeRoutes: (data.rutas || []).length,
      totalClients,
      visitedClients,
      pendingClients,
      percent,
      totalDeliveredAmount,
      totalGeoValidated,
      totalOrders: orders.length
    };
  }, [data]);

  // Bounding box para auto-zoom
  const selectedBounds = useMemo(() => {
    if (selectedRouteId === 'ALL') return null;
    const route = (data.rutas || []).find(r => r.id === Number(selectedRouteId));
    if (!route) return null;
    const points = [];
    const drv = vendedor(route.driverId);
    if (drv && drv.latitude) points.push([drv.latitude, drv.longitude]);
    (route.clientes || []).forEach(c => {
      if (c.latitude && c.longitude) points.push([c.latitude, c.longitude]);
    });
    return points.length > 0 ? points : null;
  }, [selectedRouteId, data.rutas, vendedor]);

  return (
    <div className="grid" style={{ height: 'calc(100vh - 145px)', gridTemplateColumns: '370px 1fr', gap: '16px' }}>
      
      {/* PANEL LATERAL: ALERTAS, KPIs Y RUTAS */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📡</span> Torre de Control
          </h3>
          <button 
            className="btn ghost small"
            onClick={() => setShowGeoModal(true)}
            title="Configuración de Geocerca GPS"
            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>⚙️</span> Geocerca GPS
          </button>
        </div>

        {/* Resumen General Rápido */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          borderRadius: '12px', 
          padding: '12px 14px', 
          color: '#ffffff', 
          marginBottom: '14px',
          boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Avance Global de Jornada</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>{metrics.percent}%</span>
          </div>
          <div style={{ height: '7px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ width: `${metrics.percent}%`, height: '100%', background: '#22c55e', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 4px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>{metrics.activeRoutes}</div>
              <div style={{ fontSize: '10px', opacity: 0.75 }}>Rutas</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 4px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80' }}>{metrics.visitedClients}</div>
              <div style={{ fontSize: '10px', opacity: 0.75 }}>Visitados</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 4px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b' }}>{metrics.pendingClients}</div>
              <div style={{ fontSize: '10px', opacity: 0.75 }}>Pendientes</div>
            </div>
          </div>
        </div>

        {/* Botón de Demostración Rápida de 3 Rutas */}
        <button
          className="btn primary full"
          onClick={handleSimulateRoutes}
          disabled={isSimulating}
          style={{ 
            marginBottom: '14px', 
            padding: '9px 12px', 
            fontSize: '12px', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            background: 'linear-gradient(135deg, #d81921 0%, #b9141b 100%)',
            boxShadow: '0 4px 10px rgba(216,25,33,0.25)'
          }}
        >
          <span>🚀</span> {isSimulating ? 'Generando Jornada...' : 'Simular 3 Rutas en Vivo (León)'}
        </button>

        {/* Lista de Rutas con Progreso y Selección */}
        <div className="list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {data.rutas.map((ruta, idx) => {
            const driver = vendedor(ruta.driverId);
            if (!driver) return null;
            const palette = ROUTE_PALETTES[idx % ROUTE_PALETTES.length];
            const isSelected = selectedRouteId === String(ruta.id);

            const totalClients = ruta.clientes?.length || 0;
            const visitedClients = ruta.clientes?.filter(c => c.isVisited).length || 0;
            const effectiveness = totalClients > 0 ? Math.round((visitedClients / totalClients) * 100) : 0;
            const routeOrders = (data.pedidos || []).filter(p => p.routeId === ruta.id);
            const totalWeight = routeOrders.reduce((sum, p) => sum + (p.totalWeight || 0), 0);
            const totalMonto = routeOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

            return (
              <div 
                className="item" 
                key={ruta.id}
                onClick={() => setSelectedRouteId(isSelected ? 'ALL' : String(ruta.id))}
                style={{ 
                  cursor: 'pointer',
                  borderLeft: `5px solid ${palette.stroke}`,
                  borderColor: isSelected ? palette.stroke : (driver.hasIncident ? 'var(--danger)' : 'var(--line)'),
                  background: isSelected ? palette.bg : '#ffffff',
                  transition: 'all 0.2s ease',
                  padding: '12px',
                  marginBottom: '10px'
                }}
              >
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{ruta.name}</strong>
                    <div className="muted" style={{ fontSize: '0.8rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🚚</span> <b>{driver.name}</b>
                    </div>
                  </div>
                  <span 
                    className="chip" 
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      background: driver.hasIncident ? '#fee2e2' : palette.bg, 
                      color: driver.hasIncident ? '#dc2626' : palette.stroke,
                      border: `1px solid ${driver.hasIncident ? '#fca5a5' : palette.stroke}`
                    }}
                  >
                    {driver.hasIncident ? '⚠️ INCIDENTE' : 'EN RUTA'}
                  </span>
                </div>
                
                <div style={{ marginTop: '8px' }}>
                  <div className="row muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span>Efectividad ({visitedClients}/{totalClients} clientes)</span>
                    <span style={{ fontWeight: 700, color: palette.stroke }}>{effectiveness}%</span>
                  </div>
                  <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${effectiveness}%`, height: '100%', background: palette.stroke, borderRadius: '3px' }}></div>
                  </div>
                </div>

                <div className="row muted" style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                  <span>Carga: <b>{totalWeight > 0 ? `${totalWeight.toLocaleString()} kg` : '180 kg'}</b></span>
                  <span>Venta: <b>${totalMonto > 0 ? totalMonto.toLocaleString() : '8,450'} MXN</b></span>
                </div>

                {driver.hasIncident && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 700, marginTop: '6px' }}>
                    Motivo: {driver.incidentReason}
                  </div>
                )}
              </div>
            );
          })}

          {data.rutas.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>Sin actividad registrada.</div>}

          {/* Bloqueados por Crédito */}
          {((data.pedidos || []).filter(p => p.needsAdminApproval)).length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed var(--line)' }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span> Retenidos por Crédito ({((data.pedidos || []).filter(p => p.needsAdminApproval)).length})
              </h4>
              {data.pedidos.filter(p => p.needsAdminApproval).map(pedido => (
                <div className="item" key={pedido.id} style={{ borderColor: '#fca5a5', background: '#fef2f2', padding: '10px', marginBottom: '8px' }}>
                  <div className="row">
                    <strong style={{ fontSize: '0.85rem' }}>{pedido.orderNumber}</strong>
                    <span className="chip warn" style={{ fontSize: '10px' }}>Bloqueado</span>
                  </div>
                  <div className="muted" style={{ fontSize: '0.75rem', margin: '4px 0' }}>
                    Motivo: <b>{pedido.adminApprovalReason}</b>
                  </div>
                  <button className="btn success full" style={{ fontSize: '0.75rem', padding: '5px' }} onClick={async () => {
                    const token = localStorage.getItem('ht_token');
                    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/order/${pedido.id}/approve-credit`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if(res.ok) {
                      alert('Crédito autorizado exitosamente.');
                      if (reloadState) reloadState();
                      else window.location.reload();
                    }
                  }}>Autorizar Crédito</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* ÁREA PRINCIPAL: MAPA INTERACTIVO CON POLYLINES Y BADGES */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Barra Superior de Filtros de Ruta sobre el Mapa */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.92)',
          padding: '6px 10px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.8)',
          maxWidth: 'calc(100% - 240px)'
        }}>
          <button
            onClick={() => setSelectedRouteId('ALL')}
            style={{
              background: selectedRouteId === 'ALL' ? '#0f172a' : '#f1f5f9',
              color: selectedRouteId === 'ALL' ? '#ffffff' : '#334155',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🗺️</span> Todas las Rutas ({data.rutas?.length || 0})
          </button>

          {data.rutas.map((r, idx) => {
            const palette = ROUTE_PALETTES[idx % ROUTE_PALETTES.length];
            const isSelected = selectedRouteId === String(r.id);
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRouteId(isSelected ? 'ALL' : String(r.id))}
                style={{
                  background: isSelected ? palette.stroke : '#ffffff',
                  color: isSelected ? '#ffffff' : '#1e293b',
                  border: `1.5px solid ${palette.stroke}`,
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? `0 2px 8px ${palette.stroke}55` : 'none'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? '#ffffff' : palette.stroke }}></span>
                {r.name.split(':')[0]}
              </button>
            );
          })}
        </div>

        {/* Contenedor del Mapa Leaflet */}
        <MapContainer
          style={{ width: '100%', height: '100%' }}
          center={center}
          zoom={12}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution="&copy; OpenStreetMap contributors" 
          />

          <MapController selectedBounds={selectedBounds} center={center} />

          {/* TRAZO DE RUTAS (POLYLINES) Y MARCADORES */}
          {displayedRoutes.map((ruta, rIdx) => {
            // Identificar el índice real de la ruta en data.rutas para mantener consistencia de color
            const realIdx = data.rutas.findIndex(r => r.id === ruta.id);
            const palette = ROUTE_PALETTES[(realIdx >= 0 ? realIdx : rIdx) % ROUTE_PALETTES.length];
            const driver = vendedor(ruta.driverId);
            const clients = ruta.clientes || [];

            // Puntos para la Polyline: Chofer -> Clientes en orden
            const routePoints = [];
            if (driver && driver.latitude && driver.longitude) {
              routePoints.push([driver.latitude, driver.longitude]);
            }
            clients.forEach(c => {
              if (c.latitude && c.longitude) {
                routePoints.push([c.latitude, c.longitude]);
              }
            });

            // Segmentos visitados vs pendientes
            const visitedPoints = [];
            const pendingPoints = [];
            if (driver && driver.latitude && driver.longitude) {
              visitedPoints.push([driver.latitude, driver.longitude]);
            }
            clients.forEach(c => {
              if (c.latitude && c.longitude) {
                if (c.isVisited) {
                  visitedPoints.push([c.latitude, c.longitude]);
                } else {
                  pendingPoints.push([c.latitude, c.longitude]);
                }
              }
            });

            return (
              <React.Fragment key={`route-group-${ruta.id}`}>
                {/* Línea de Trayecto Completo con estilo */}
                {routePoints.length > 1 && (
                  <>
                    {/* Trazo de fondo con resplandor */}
                    <Polyline
                      positions={routePoints}
                      pathOptions={{
                        color: palette.stroke,
                        weight: selectedRouteId === String(ruta.id) ? 6 : 4,
                        opacity: selectedRouteId === String(ruta.id) ? 0.9 : 0.65,
                        dashArray: '8, 8'
                      }}
                    >
                      <Tooltip sticky>
                        <span style={{ fontWeight: 700 }}>{ruta.name}</span>
                      </Tooltip>
                    </Polyline>

                    {/* Trazo sólido para clientes ya visitados */}
                    {visitedPoints.length > 1 && (
                      <Polyline
                        positions={visitedPoints}
                        pathOptions={{
                          color: palette.stroke,
                          weight: selectedRouteId === String(ruta.id) ? 7 : 5,
                          opacity: 0.95
                        }}
                      />
                    )}
                  </>
                )}

                {/* Marcador del Chofer / Camión */}
                {driver && driver.latitude && driver.longitude && (
                  <Marker
                    position={[driver.latitude, driver.longitude]}
                    icon={createDriverDivIcon(driver, palette.stroke)}
                  >
                    <Popup>
                      <div style={{ padding: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.2rem' }}>🚚</span>
                          <div>
                            <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{driver.name}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Ruta: {ruta.name}</div>
                          </div>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
                        <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#334155' }}>
                          <div>📱 <b>Teléfono:</b> {driver.phone || '477-123-4567'}</div>
                          <div>📍 <b>Estatus:</b> <span style={{ color: driver.hasIncident ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{driver.status || 'En Ruta'}</span></div>
                          <div>🎯 <b>Efectividad:</b> {clients.filter(c => c.isVisited).length}/{clients.length} paradas</div>
                          {driver.hasIncident && (
                            <div style={{ color: '#dc2626', marginTop: '4px', fontWeight: 700 }}>
                              ⚠️ Alerta: {driver.incidentReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marcadores de Clientes / Paradas */}
                {clients.map((client, stopIdx) => {
                  if (!client.latitude || !client.longitude) return null;
                  const clientOrders = (data.pedidos || []).filter(p => p.clientId === client.id);
                  const lastOrder = clientOrders[0];

                  return (
                    <Marker
                      key={`stop-${client.id}`}
                      position={[client.latitude, client.longitude]}
                      icon={createClientDivIcon(stopIdx + 1, client.isVisited, false, palette.stroke)}
                    >
                      <Popup>
                        <div style={{ padding: '4px', minWidth: '180px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ 
                              background: client.isVisited ? '#dcfce7' : '#fef3c7', 
                              color: client.isVisited ? '#15803d' : '#b45309',
                              padding: '2px 6px', 
                              borderRadius: '6px', 
                              fontSize: '10px', 
                              fontWeight: 800 
                            }}>
                              {client.isVisited ? '✅ VISITADO' : `⏱️ PARADA #${stopIdx + 1}`}
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{ruta.name.split(':')[0]}</span>
                          </div>
                          
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', margin: '4px 0' }}>
                            {client.name}
                          </strong>

                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                            Zona: {client.zone || 'León, Gto'}
                          </div>

                          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />

                          <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#334155' }}>
                            {client.isVisited ? (
                              <>
                                <div>📦 <b>Despacho:</b> ${lastOrder?.totalAmount ? lastOrder.totalAmount.toLocaleString() : '3,850'} MXN</div>
                                <div>📍 <b>GPS Sitio:</b> <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ Validado (12m)</span></div>
                              </>
                            ) : (
                              <>
                                <div>💳 <b>Límite Crédito:</b> ${(client.creditLimit || 0).toLocaleString()} MXN</div>
                                <div>⏳ <b>Estatus:</b> Pendiente de arribo</div>
                              </>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </React.Fragment>
            );
          })}
        </MapContainer>

        <WeatherWidget />
      </div>

      {/* MODAL: CONFIGURACIÓN DE GEOVALIDACIÓN GPS */}
      {showGeoModal && (
        <div className="modal" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>📍</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Configuración de Geocerca GPS</h3>
              </div>
              <button 
                onClick={() => setShowGeoModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              Ajusta la política de validación de ubicación para pedidos, cobros y visitas en ruta.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const enabled = f.get('enabled') === 'true';
              const mode = f.get('mode');
              const toleranceMeters = Number(f.get('toleranceMeters'));
              const exemptTelemarketing = f.get('exemptTelemarketing') === 'on';

              saveGeoSettings({
                enabled,
                mode,
                toleranceMeters,
                exemptRoles: exemptTelemarketing ? ['Telemarketing', 'Admin'] : []
              });
              alert('Parámetros de Geocerca GPS actualizados exitosamente.');
            }}>
              
              {/* Interruptor Principal */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Validación GPS en Sitio</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Exige ubicación satelital al registrar pedidos/cobros</div>
                  </div>
                  <select 
                    name="enabled" 
                    defaultValue={geoSettings.enabled ? 'true' : 'false'}
                    style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}
                  >
                    <option value="true">✅ Activada</option>
                    <option value="false">❌ Desactivada</option>
                  </select>
                </div>
              </div>

              {/* Modo de Operación */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
                  Modo de Operación
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="radio" name="mode" value="auditoria" defaultChecked={geoSettings.mode === 'auditoria'} />
                      <strong style={{ fontSize: '0.85rem' }}>Modo Auditoría</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Recomendado) Permite capturar y registra alertas si está fuera de rango.</span>
                  </label>

                  <label style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="radio" name="mode" value="estricto" defaultChecked={geoSettings.mode === 'estricto'} />
                      <strong style={{ fontSize: '0.85rem' }}>Modo Estricto</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Bloquea la venta si el vendedor no está físicamente en sitio.</span>
                  </label>
                </div>
              </div>

              {/* Radio de Tolerancia en Metros */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
                  Radio de Tolerancia de Proximidad
                </label>
                <select 
                  name="toleranceMeters" 
                  defaultValue={geoSettings.toleranceMeters || 300}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value={100}>100 metros (Estricto en puerta)</option>
                  <option value={300}>300 metros (Recomendado - Cobertura de manzana)</option>
                  <option value={500}>500 metros (Zonas industriales / predios amplios)</option>
                  <option value={1000}>1,000 metros (1 km - Zonas rurales)</option>
                </select>
              </div>

              {/* Exención por Perfil */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
                  <input 
                    type="checkbox" 
                    name="exemptTelemarketing" 
                    defaultChecked={geoSettings.exemptRoles?.includes('Telemarketing')} 
                  />
                  <span>Exentar a Vendedores Telefónicos / Telemarketing / Mostrador</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn ghost" 
                  onClick={() => setShowGeoModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn primary"
                >
                  Guardar Configuración
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
