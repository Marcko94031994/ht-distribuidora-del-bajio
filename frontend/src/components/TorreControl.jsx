import React, { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

export default function TorreControl({data,vendedor}){
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

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
            const totalOrders = data.pedidos?.filter(p => p.routeId === ruta.id).length || 0;

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
                   {driver.hasIncident && <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{driver.incidentReason}</span>}
                </div>
              </div>
            );
          })}
          {data.rutas.length === 0 && <div className="muted">Sin actividad registrada.</div>}
        </div>
      </div>
      
      <div className="card double" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%' }}>
        {!isLoaded ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando mapa...</div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={12}
            options={{ disableDefaultUI: true }}
          >
            {data.rutas.map(ruta => {
              const driver = vendedor(ruta.driverId);
              if(driver && driver.latitude){
                return (
                  <Marker
                    key={`driver-${driver.id}`}
                    position={{ lat: driver.latitude, lng: driver.longitude }}
                    icon={driver.hasIncident ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'}
                    label={{ text: "ð", fontSize: '16px' }}
                  />
                );
              }
              return null;
            })}
            {data.rutas.flatMap(r => r.clientes || []).map(c => (
              <Marker
                key={`client-${c.id}`}
                position={{ lat: c.latitude || 21.12, lng: c.longitude || -101.68 }}
                icon={c.isVisited ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'}
              />
            ))}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}
