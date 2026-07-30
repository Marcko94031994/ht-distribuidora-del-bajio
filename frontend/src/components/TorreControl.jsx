import React, { useMemo } from 'react';
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
      </div>
    </div>
  );
}
