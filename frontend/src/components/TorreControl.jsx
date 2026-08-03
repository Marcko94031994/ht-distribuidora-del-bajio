import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Solución para iconos default de leaflet en react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createColoredIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23${color}" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconGreen = createColoredIcon('16a34a'); // Visitado
const iconYellow = createColoredIcon('d97706'); // Pendiente
const iconBlue = createColoredIcon('0056b3'); // Vendedor Activo
const iconRed = createColoredIcon('dc2626'); // Vendedor Incidente

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

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

  const desc = weatherDescriptions[weather.weathercode] || 'Desconocido';
  
  // Basic emoji logic based on weather code
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
      position: 'absolute', top: '15px', right: '15px', zIndex: 1000,
      background: 'rgba(255,255,255,0.9)', padding: '10px 15px', borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px',
      backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.5)'
    }}>
      <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>
        {getEmoji(weather.weathercode)}
      </div>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1f2937' }}>León, Gto</div>
        <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
          {weather.temperature}°C • {desc}
        </div>
      </div>
    </div>
  );
};

export default function TorreControl({data,vendedor}){
  const center = { lat: 21.1213, lng: -101.6826 };

  return (
    <div className="grid" style={{ height: 'calc(100vh - 150px)', gridTemplateColumns: '360px 1fr' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-h">
          <h3>Alertas y Estatus</h3>
        </div>
        <div className="card-b list" style={{ flex: 1, overflowY: 'auto' }}>
          {data.rutas.map(ruta => {
            const driver = vendedor(ruta.driverId);
            if(!driver) return null;
            
            const totalClients = ruta.clientes?.length || 0;
            const visitedClients = ruta.clientes?.filter(c => c.isVisited).length || 0;
            const effectiveness = totalClients > 0 ? (visitedClients / totalClients * 100).toFixed(0) : 0;
            const geoValidations = data.pedidos?.filter(p => p.routeId === ruta.id && p.isGeoValidated).length || 0;
            const routeOrders = data.pedidos?.filter(p => p.routeId === ruta.id) || [];
            const totalOrders = routeOrders.length;
            const totalWeight = routeOrders.reduce((sum, p) => sum + (p.totalWeight || 0), 0);

            return (
              <div className="item" key={ruta.id} style={{ borderColor: driver.hasIncident ? 'var(--danger)' : 'var(--line)' }}>
                <div className="row">
                  <strong>{ruta.name}</strong>
                  <span className={`chip ${driver.hasIncident ? 'warn' : 'ok'}`}>
                    {driver.hasIncident ? 'INCIDENTE' : 'ACTIVA'}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '0.85rem' }}>Vendedor: {driver.name}</div>
                
                <div style={{ marginTop: '10px' }}>
                   <div className="row muted" style={{ fontSize: '0.75rem' }}>
                      <span>Efectividad de Visita</span>
                      <span>{effectiveness}%</span>
                   </div>
                   <div className="progress-bar" style={{ height: '6px', background: '#eee', borderRadius: '3px' }}>
                      <div style={{ width: `${effectiveness}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }}></div>
                   </div>
                </div>

                <div className="row muted" style={{ fontSize: '0.75rem', marginTop: '10px' }}>
                   <span>GPS Validado: <b>{geoValidations}/{totalOrders}</b></span>
                   <span>Carga: <b>{totalWeight.toLocaleString()} kg</b></span>
                   {driver.hasIncident && <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{driver.incidentReason}</span>}
                </div>
              </div>
            );
          })}
          {data.rutas.length === 0 && <div className="muted">Sin actividad registrada.</div>}

          {data.pedidos?.filter(p => p.needsAdminApproval).length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px dashed var(--line)' }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: '10px' }}>⚠️ Retenidos por Crédito</h4>
              {data.pedidos.filter(p => p.needsAdminApproval).map(pedido => (
                <div className="item" key={pedido.id} style={{ borderColor: 'var(--danger)', background: '#fef2f2' }}>
                  <div className="row">
                    <strong>{pedido.orderNumber}</strong>
                    <span className="chip warn">Bloqueado</span>
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                    Motivo: <b>{pedido.adminApprovalReason}</b>
                  </div>
                  <button className="btn success full" style={{ fontSize: '0.8rem', padding: '6px' }} onClick={async () => {
                    const token = localStorage.getItem('ht_token');
                    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/order/${pedido.id}/approve-credit`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if(res.ok) {
                      alert('Crédito autorizado. El pedido ha sido liberado a Remisiones.');
                      window.location.reload();
                    }
                  }}>Autorizar Crédito</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%', zIndex: 1 }}>
        <MapContainer
          style={mapContainerStyle}
          center={center}
          zoom={12}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {data.rutas.map(ruta => {
            const driver = vendedor(ruta.driverId);
            if(driver && driver.latitude){
              return (
                <Marker
                  key={`driver-${driver.id}`}
                  position={[driver.latitude, driver.longitude]}
                  icon={driver.hasIncident ? iconRed : iconBlue}
                >
                  <Popup>🚚 Vendedor: {driver.name}</Popup>
                </Marker>
              );
            }
            return null;
          })}
          {data.rutas.flatMap(r => r.clientes || []).map(c => (
            <Marker
              key={`client-${c.id}`}
              position={[c.latitude || 21.12, c.longitude || -101.68]}
              icon={c.isVisited ? iconGreen : iconYellow}
            >
              <Popup>{c.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
        <WeatherWidget />
      </div>
    </div>
  );
}
