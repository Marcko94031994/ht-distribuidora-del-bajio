import React, { useMemo, useState, useEffect } from 'react';
import { pesos } from '../utils/helpers';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createColoredIcon = (color, text) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#${color};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${text || ''}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px'
};

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Vendedor({data,ruta,cliente,setSelectedCliente,vendedor,sucursal,producto,almacen,cart,setCart,addCart,enviarPedido,reportarContratiempo}){
  const [photoBase64, setPhotoBase64] = useState(null);
  const [isBox, setIsBox] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [debtWarning, setDebtWarning] = useState(false);
  const [routeLine, setRouteLine] = useState([]);

  // Fetch ruta óptima de OSRM
  useEffect(() => {
    if (ruta && ruta.clientes && ruta.clientes.length > 1) {
      // OSRM espera longitud,latitud separados por ;
      const coordinates = ruta.clientes.map(c => `${c.longitude || -101.6826},${c.latitude || 21.1213}`).join(';');
      fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes.length > 0) {
            // OSRM devuelve [lon, lat], leaflet usa [lat, lon]
            const line = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            setRouteLine(line);
          }
        })
        .catch(err => console.error('Error fetching OSRM route:', err));
    }
  }, [ruta]);

  const validateGeofence = (callback) => {
    if (!cliente.latitude || !cliente.longitude) {
      // Si el cliente no tiene coordenadas, dejar pasar (no hay como validarlo)
      callback(0, 0);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceFromLatLonInM(pos.coords.latitude, pos.coords.longitude, cliente.latitude, cliente.longitude);
        if (dist > 50) {
          alert(`📍 Geocerca Activa: Estás a ${Math.round(dist)} metros del cliente.\n\nDebes acercarte a menos de 50m para realizar esta acción.`);
          return;
        }
        callback(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        alert("Debes permitir el acceso al GPS para validar la ubicación.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleAbono = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = Number(f.get('amount'));
    const method = f.get('method');
    if (!amount || amount <= 0) return;
    
    validateGeofence(async (lat, lng) => {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          clientId: cliente.id, 
          amount, 
          paymentMethod: method
        })
      });
      
      if (res.ok) {
        alert('Abono registrado exitosamente. Ya puedes confirmar el pedido.');
        window.location.reload();
      }
    });
  };

  const filtered = (data.productos || []).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const center = useMemo(() => {
    if (ruta && ruta.clientes && ruta.clientes.length > 0) {
      return [ruta.clientes[0].latitude || 21.1213, ruta.clientes[0].longitude || -101.6826];
    }
    return [21.1213, -101.6826];
  }, [ruta]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if(!ruta) {
    return (
      <div className="glass" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>🚚 Sin ruta asignada</h2>
        <p className="muted">No tienes una ruta activa programada para el día de hoy.</p>
        <p className="muted">Por favor, contacta a tu supervisor o revisa la Torre de Control.</p>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Ruta del día</h3>
          <span className="chip ok">{ruta.dayOfWeek}</span>
        </div>
        <div className="card-b list">
          {(ruta.clientes || []).map(c=>(
            <div className={'item '+(cliente?.id===c.id?'active':'')} onClick={()=>setSelectedCliente(c.id)} key={c.id}>
              <div className="row">
                <b>{c.name}</b>
                <span className={'chip '+(c.isVisited?'ok':'warn')}>{c.isVisited?'Visitado':'Pendiente'}</span>
              </div>
              <div className="muted">{c.zone}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <div>
            <h3>{ruta.name}</h3>
            <div className="muted">{vendedor(ruta.driverId)?.name} · {sucursal(ruta.branchId)?.name}</div>
          </div>
        </div>
        <div className="card-b">
          <div className="map-wrapper" style={{ marginBottom: '1rem', zIndex: 1, position: 'relative' }}>
            <MapContainer
              style={mapContainerStyle}
              center={center}
              zoom={13}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {routeLine.length > 0 && (
                <Polyline positions={routeLine} color="#0056b3" weight={4} opacity={0.7} />
              )}
              {(ruta.clientes || []).map((c, i) => {
                const color = cliente?.id === c.id ? '0056b3' : (c.isVisited ? '16a34a' : 'dc2626');
                const text = (i + 1).toString();
                return (
                  <Marker
                    key={c.id}
                    position={[c.latitude || 21.1213, c.longitude || -101.6826]}
                    icon={createColoredIcon(color, text)}
                    eventHandlers={{
                      click: () => setSelectedCliente(c.id)
                    }}
                  >
                    <Popup>{c.name}</Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
          <br/>
          <h3>Nuevo pedido</h3>
          <div className="form-grid">
            <select id="prodPedido" className="select full">
              {data.productos.map(p=><option value={p.id} key={p.id}>{p.name} · {pesos(p.price)} pza</option>)}
            </select>
            <input id="qtyPedido" className="input" type="number" min="1" defaultValue="1"/>
            <button className={`btn ${isBox ? 'secondary' : 'primary'}`} onClick={() => setIsBox(!isBox)}>
              {isBox ? 'Cajas' : 'Piezas'}
            </button>
            <button className="btn" onClick={() => addCart(null, null, isBox)}>Agregar</button>
          </div>
          <br/>
          <div>
            {cart.length===0?<div className="item muted">Sin productos agregados.</div>:<>
              <div className="cart-row cart-head">
                <div>Producto</div><div>Cant.</div><div>U.M.</div><div>Precio</div><div>Subtotal</div><div></div>
              </div>
              {cart.map((l,i)=>{
                const p=producto(l.productoId);
                return (
                  <div className="cart-row" key={i}>
                    <div>{p.name}</div><div>{l.cantidad}</div><div>{l.isBox ? 'Caja(s)' : 'Pza(s)'}</div><div>{pesos(l.unitPrice)}</div><div>{pesos(l.unitPrice*l.cantidad)}</div>
                    <button className="btn secondary" onClick={()=>setCart(c=>c.filter((_,idx)=>idx!==i))}>Quitar</button>
                  </div>
                )
              })}
              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <label className="muted">Evidencia Fotográfica del Local / Pedido:</label>
                <input type="file" accept="image/*" capture="environment" className="input full" onChange={handlePhoto} />
                {photoBase64 && <img src={photoBase64} alt="Evidencia" style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '10px', borderRadius: '4px' }} />}
              </div>

              {debtWarning ? (
                <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fca5a5', marginBottom: '15px' }}>
                  <h4 style={{ color: '#b91c1c', margin: '0 0 10px 0' }}>⚠️ Cliente con Deuda Pendiente</h4>
                  <p style={{ margin: '0 0 10px 0' }}>El cliente tiene un adeudo de <b>{pesos(cliente.currentBalance)}</b>.</p>
                  
                  {data.cxc?.find(c => c.id === cliente.id)?.unpaidOrders?.length > 0 && (
                    <ul style={{ margin: '0 0 15px 15px', padding: 0, fontSize: '0.85rem' }}>
                      {data.cxc.find(c => c.id === cliente.id).unpaidOrders.map(o => (
                        <li key={o.id} style={{ color: o.isOverdue ? '#b91c1c' : '#b45309', fontWeight: o.isOverdue ? 'bold' : 'normal' }}>
                          {o.isOverdue ? '🚨 VENCIDA - ' : '⏳ '} 
                          Nota {o.orderNumber} (Vence: {o.dueDate ? o.dueDate.split('T')[0] : 'N/A'}) - 
                          Debe: {pesos(o.totalAmount - o.amountPaid)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>Se sugiere realizar cobranza en esta visita.</p>
                  
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <form onSubmit={handleAbono} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input name="amount" type="number" step="0.01" className="input" placeholder="Monto a abonar" required style={{ flex: 1 }} />
                      <select name="method" className="select">
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                      </select>
                      <button type="submit" className="btn success">Cobrar</button>
                    </form>
                    
                    <button className="btn warning full" onClick={() => { 
                      validateGeofence((lat, lng) => {
                        enviarPedido(photoBase64, lat, lng); 
                        setPhotoBase64(null);
                        setDebtWarning(false);
                      });
                    }}>
                      Forzar Venta a Crédito (Requiere Autorización)
                    </button>
                    <button className="btn secondary full" onClick={() => setDebtWarning(false)}>Cancelar Pedido</button>
                  </div>
                </div>
              ) : (
                <button className="btn success" onClick={() => {
                  if (cliente.currentBalance > 0) {
                    setDebtWarning(true);
                    return;
                  }
                  validateGeofence((lat, lng) => {
                    enviarPedido(photoBase64, lat, lng); 
                    setPhotoBase64(null);
                  });
                }}>Confirmar Pedido</button>
              )}
            </>}
          </div>
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--line)', paddingTop: '20px', display: 'grid', gap: '10px' }}>
            <button className="btn warning full" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => {
              const reason = prompt("Motivo de No Venta (ej. Cerrado, No hay dinero, Falta Stock):");
              if (!reason) return;
              validateGeofence(async (lat, lng) => {
                const token = localStorage.getItem('ht_token');
                await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/visit', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                   body: JSON.stringify({ 
                     clientId: cliente.id, 
                     driverId: ruta.driverId, 
                     saleAccomplished: false, 
                     noSaleReason: reason,
                     latitude: lat,
                     longitude: lng
                   })
                });
                alert('Visita registrada');
                window.location.reload(); 
              });
            }}>
              Registrar Visita sin Venta
            </button>
            <button className="btn secondary full" onClick={reportarContratiempo}>
              Reportar Contratiempo Logístico
            </button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Inventario disponible</h3>
          <input className="input" style={{ maxWidth: '180px', padding: '6px 12px' }} placeholder="🔍 Buscar SKU / Nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="card-b list">
          {filtered.map(p=>(
            <div className="item" key={p.id} style={{ paddingBottom: expandedId === p.id ? '1.5rem' : '14px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ width: '60px' }}>
                   {p.images && p.images.length > 0 ? (
                     <img src={p.images[0].photoBase64} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                   ) : (
                     <div style={{ width: '60px', height: '60px', background: 'var(--bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>📦</div>
                   )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <b>{p.name}</b>
                    <span className={'chip '+(p.availableStock<=10?'warn':'ok')}>Disp: {p.availableStock} pzas</span>
                  </div>
                  <div className="muted" style={{ marginBottom: expandedId === p.id ? '0.8rem' : '0' }}>{almacen(p.warehouseId)?.name} · SKU: {p.sku}</div>
                  
                  {expandedId === p.id && (
                    <div style={{ marginTop: '0.8rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                        <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>P. Unidad</div>
                          <b style={{ color: 'var(--primary)' }}>{pesos(p.price)}</b>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>P. Mayoreo</div>
                          <b style={{ color: 'var(--text)' }}>{pesos(p.volumePrice)}</b>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>P. Caja ({p.unitsPerBox})</div>
                          <b style={{ color: 'var(--success)' }}>{pesos(p.boxPrice)}</b>
                        </div>
                      </div>
                      <button className="btn success full" style={{ marginTop: '0.8rem' }} onClick={() => addCart(p.id)}>Agregar al Pedido</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
