import React, { useMemo, useState, useEffect } from 'react';
import { pesos } from '../utils/helpers';
import { useDeviceMode } from '../utils/useDeviceMode';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import SearchableSelect from './SearchableSelect';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createColoredIcon = (color, text) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#${color};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${text || ''}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const mapContainerStyle = {
  width: '100%',
  height: '260px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0'
};

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Vendedor({
  data,
  ruta,
  cliente,
  setSelectedCliente,
  vendedor,
  sucursal,
  producto,
  almacen,
  cart,
  setCart,
  addCart,
  enviarPedido,
  reportarContratiempo,
  reloadState
}) {
  const { isPWA, isMobile, windowWidth } = useDeviceMode();
  const [mobileTab, setMobileTab] = useState('ruta'); // 'ruta' | 'pedido' | 'catalogo'
  const [photoBase64, setPhotoBase64] = useState(null);
  const [isBox, setIsBox] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [qtyPedido, setQtyPedido] = useState(1);
  const [debtWarning, setDebtWarning] = useState(false);
  const [routeLine, setRouteLine] = useState([]);

  // Fetch ruta óptima de OSRM
  useEffect(() => {
    if (ruta && ruta.clientes && ruta.clientes.length > 1) {
      const coordinates = ruta.clientes.map(c => `${c.longitude || -101.6826},${c.latitude || 21.1213}`).join(';');
      fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes.length > 0) {
            const line = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            setRouteLine(line);
          }
        })
        .catch(err => console.error('Error fetching OSRM route:', err));
    }
  }, [ruta]);

  const validateGeofence = (callback) => {
    // Configuración de geovalidación configurable (Global / Vendedor)
    let geoSettings = { enabled: true, toleranceMeters: 300, mode: 'auditoria' };
    try {
      const saved = localStorage.getItem('ht_geo_settings');
      if (saved) geoSettings = { ...geoSettings, ...JSON.parse(saved) };
    } catch(e){}

    // Si la geovalidación está desactivada, proceder inmediatamente
    if (!geoSettings.enabled) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => callback(pos.coords.latitude, pos.coords.longitude),
          () => callback(0, 0),
          { timeout: 3000 }
        );
      } else {
        callback(0, 0);
      }
      return;
    }

    if (!cliente || !cliente.latitude || !cliente.longitude) {
      callback(0, 0);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceFromLatLonInM(pos.coords.latitude, pos.coords.longitude, cliente.latitude, cliente.longitude);
        const maxDist = geoSettings.toleranceMeters || 300;
        
        if (dist > maxDist) {
          if (geoSettings.mode === 'estricto') {
            alert(`📍 Geocerca Estricta: Estás a ${Math.round(dist)}m del cliente.\n\nTolerancia máxima: ${maxDist}m.\nAcércate al sitio para capturar esta acción.`);
            return;
          } else {
            // Modo Auditoría: Permite la operación pero alerta al usuario
            console.warn(`[GPS Auditoría] Captura fuera de rango: ${Math.round(dist)}m del cliente (Tolerancia: ${maxDist}m)`);
          }
        }
        callback(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (geoSettings.mode === 'estricto') {
          alert("📍 Debes permitir el acceso al GPS para validar la ubicación del cliente.");
        } else {
          console.warn("GPS no disponible en modo auditoría, procediendo...");
          callback(0, 0);
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
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
        if (reloadState) reloadState();
        else window.location.reload();
      }
    });
  };

  const filtered = (data.productos || []).filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const center = useMemo(() => {
    if (cliente && cliente.latitude && cliente.longitude) {
      return [cliente.latitude, cliente.longitude];
    }
    if (ruta && ruta.clientes && ruta.clientes.length > 0) {
      return [ruta.clientes[0].latitude || 21.1213, ruta.clientes[0].longitude || -101.6826];
    }
    return [21.1213, -101.6826];
  }, [ruta, cliente]);

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
      <div className="card" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Sin ruta asignada</h2>
        <p className="muted">No tienes una ruta activa programada para el día de hoy.</p>
        <p className="muted" style={{ fontSize: '13px' }}>Por favor, contacta a tu supervisor o revisa la Torre de Control.</p>
      </div>
    );
  }

  const filteredClients = useMemo(() => {
    const list = ruta.clientes || [];
    if (!clientSearch) return list;
    const term = clientSearch.toLowerCase();
    return list.filter(c => 
      c.name?.toLowerCase().includes(term) || 
      c.zone?.toLowerCase().includes(term) ||
      c.rfc?.toLowerCase().includes(term)
    );
  }, [ruta.clientes, clientSearch]);

  const visitedCount = (ruta.clientes || []).filter(c => c.isVisited).length;
  const totalCount = (ruta.clientes || []).length;
  const progressPercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  const handleAddProductToCart = () => {
    if (!selectedProdId) {
      alert('Por favor selecciona un producto');
      return;
    }
    const q = Number(qtyPedido) || 1;
    if (q <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    addCart(Number(selectedProdId), q, isBox);
  };

  const openNavigationApp = (c) => {
    if (!c.latitude || !c.longitude) {
      alert('El cliente no tiene coordenadas registradas.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;
    window.open(url, '_blank');
  };

  const isTouchAppMode = isMobile || (isPWA && windowWidth < 1024);

  // RENDER SECCIONES
  const renderRutaCard = () => (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>📍 Ruta: {ruta.dayOfWeek}</h3>
          <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
            {visitedCount} de {totalCount} visitados ({progressPercent}%)
          </div>
        </div>
        <span className="chip ok" style={{ fontWeight: 800 }}>{ruta.dayOfWeek}</span>
      </div>

      {/* Progress Bar */}
      <div style={{ background: '#e2e8f0', height: '6px', width: '100%' }}>
        <div style={{ background: 'var(--success, #16a34a)', height: '100%', width: `${progressPercent}%`, transition: 'width 0.3s' }} />
      </div>

      <div className="card-b list" style={{ flex: 1, overflowY: 'auto', maxHeight: isTouchAppMode ? 'calc(100vh - 220px)' : '720px' }}>
        <input
          type="text"
          className="input full"
          style={{ marginBottom: '10px', fontSize: '13px' }}
          placeholder="🔍 Filtrar clientes en ruta..."
          value={clientSearch}
          onChange={e => setClientSearch(e.target.value)}
        />
        {filteredClients.map((c, index) => {
          const isSelected = cliente?.id === c.id;
          const hasDebt = (c.currentBalance || 0) > 0;
          return (
            <div 
              className={`item ${isSelected ? 'active' : ''}`} 
              onClick={() => {
                setSelectedCliente(c.id);
                if (isTouchAppMode) setMobileTab('pedido');
              }} 
              key={c.id}
              style={{
                cursor: 'pointer',
                borderRadius: '8px',
                marginBottom: '6px',
                border: isSelected ? '1.5px solid var(--primary, #0056b3)' : '1px solid #e2e8f0',
                background: isSelected ? '#eff6ff' : '#ffffff',
                padding: '10px 12px'
              }}
            >
              <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: c.isVisited ? '#16a34a' : '#ef4444', 
                      color: '#fff', 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {index + 1}
                    </span>
                    <b style={{ fontSize: '14px', color: '#1e293b' }}>{c.name}</b>
                  </div>
                  <div className="muted" style={{ fontSize: '12px', marginTop: '2px', marginLeft: '26px' }}>
                    {c.zone || 'Sin zona'} {c.phone ? `· 📞 ${c.phone}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`chip ${c.isVisited ? 'ok' : 'warn'}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
                    {c.isVisited ? 'Visitado' : 'Pendiente'}
                  </span>
                  {hasDebt && (
                    <span style={{ fontSize: '11px', color: 'var(--danger, #dc2626)', fontWeight: 800 }}>
                      Debe: {pesos(c.currentBalance)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', padding: '24px' }}>
            No se encontraron clientes
          </div>
        )}
      </div>
    </div>
  );

  const renderPedidoCard = () => (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>{ruta.name}</h3>
          <div className="muted" style={{ fontSize: '12px' }}>
            {vendedor(ruta.driverId)?.name} · {sucursal(ruta.branchId)?.name}
          </div>
        </div>
        {cliente && (
          <button 
            className="btn secondary" 
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => openNavigationApp(cliente)}
            title="Navegar con Google Maps / Waze"
          >
            🗺️ GPS Ruta
          </button>
        )}
      </div>
      
      <div className="card-b" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Banner de Cliente Seleccionado */}
        {cliente ? (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cliente Seleccionado</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>{cliente.name}</div>
                <div className="muted" style={{ fontSize: '12px' }}>{cliente.address || 'Sin domicilio registrado'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Saldo Pendiente</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: (cliente.currentBalance || 0) > 0 ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)' }}>
                  {pesos(cliente.currentBalance || 0)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px', marginBottom: '14px', textAlign: 'center', fontSize: '13px', color: '#b45309' }}>
            👈 Selecciona un cliente de la ruta para iniciar la toma de pedido o visita.
          </div>
        )}

        {/* Mapa Leaflet */}
        <div className="map-wrapper" style={{ marginBottom: '14px', zIndex: 1, position: 'relative' }}>
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
                    click: () => {
                      setSelectedCliente(c.id);
                    }
                  }}
                >
                  <Popup>
                    <b>{c.name}</b><br/>
                    {c.zone}<br/>
                    {c.isVisited ? '✅ Visitado' : '⏳ Pendiente'}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Selector y Creador de Pedido */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', color: '#1e293b' }}>
            🛒 Agregar Producto al Pedido
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <SearchableSelect
                options={data.productos || []}
                value={selectedProdId}
                onChange={(val) => setSelectedProdId(val)}
                placeholder="🔍 Escribe nombre o SKU del producto..."
                getOptionLabel={(p) => p.name}
                getOptionValue={(p) => p.id}
                getOptionSubtext={(p) => `${pesos(p.price)} pza ${p.sku ? `· SKU: ${p.sku}` : ''} · Disp: ${p.availableStock || 0}`}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px' }}>
              <div>
                <input 
                  id="qtyPedido" 
                  className="input full" 
                  type="number" 
                  min="1" 
                  value={qtyPedido} 
                  onChange={e => setQtyPedido(e.target.value)} 
                  placeholder="Cant."
                />
              </div>
              <div>
                <button 
                  type="button"
                  className={`btn full ${isBox ? 'secondary' : 'primary'}`} 
                  onClick={() => setIsBox(!isBox)}
                  style={{ fontSize: '12px', padding: '8px 4px' }}
                >
                  {isBox ? '📦 Cajas' : '🛒 Piezas'}
                </button>
              </div>
              <div>
                <button 
                  type="button"
                  className="btn success full" 
                  onClick={handleAddProductToCart}
                  style={{ fontSize: '13px', fontWeight: 800 }}
                >
                  ➕ Añadir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carrito de Productos */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>
              Resumen del Pedido ({cart.length} partidas)
            </div>
            {cart.length > 0 && (
              <button className="btn secondary" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => setCart([])}>
                Vaciar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '16px', fontSize: '13px' }}>
              Sin productos agregados al pedido actual.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {cart.map((l, i) => {
                  const p = producto(l.productoId);
                  const subtotal = (l.unitPrice || 0) * (l.cantidad || 0);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p?.name || 'Producto'}
                        </div>
                        <div className="muted" style={{ fontSize: '11px' }}>
                          {l.cantidad} {l.isBox ? 'Caja(s)' : 'Pza(s)'} × {pesos(l.unitPrice)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <b style={{ fontSize: '13px', color: '#0f172a' }}>{pesos(subtotal)}</b>
                        <button 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }} 
                          onClick={() => setCart(c => c.filter((_, idx) => idx !== i))}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total del Carrito */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800 }}>Total Pedido:</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--primary, #0056b3)' }}>
                  {pesos(cart.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.cantidad || 0)), 0))}
                </span>
              </div>

              {/* Evidencia Fotográfica */}
              <div style={{ marginBottom: '14px' }}>
                <label className="muted" style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  📸 Evidencia Fotográfica de la Visita:
                </label>
                <input type="file" accept="image/*" capture="environment" className="input full" onChange={handlePhoto} style={{ fontSize: '12px' }} />
                {photoBase64 && (
                  <div style={{ marginTop: '8px', position: 'relative', display: 'inline-block' }}>
                    <img src={photoBase64} alt="Evidencia" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button 
                      onClick={() => setPhotoBase64(null)} 
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Alerta de Deuda o Confirmación */}
              {debtWarning ? (
                <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '8px', border: '1px solid #fca5a5', marginBottom: '14px' }}>
                  <h4 style={{ color: '#b91c1c', margin: '0 0 8px 0', fontSize: '14px' }}>⚠️ Cliente con Deuda Pendiente</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>El cliente tiene un adeudo de <b>{pesos(cliente?.currentBalance || 0)}</b>.</p>
                  
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <form onSubmit={handleAbono} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input name="amount" type="number" step="0.01" className="input" placeholder="Monto a abonar" required style={{ flex: 1, fontSize: '13px' }} />
                      <select name="method" className="select" style={{ fontSize: '13px' }}>
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                      </select>
                      <button type="submit" className="btn success" style={{ fontSize: '13px' }}>Cobrar</button>
                    </form>
                    
                    <button className="btn warning full" style={{ fontSize: '12px' }} onClick={() => { 
                      validateGeofence((lat, lng) => {
                        enviarPedido(photoBase64, lat, lng); 
                        setPhotoBase64(null);
                        setDebtWarning(false);
                      });
                    }}>
                      Forzar Venta a Crédito (Autorización)
                    </button>
                    <button className="btn secondary full" style={{ fontSize: '12px' }} onClick={() => setDebtWarning(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="btn success full" 
                  style={{ padding: '12px', fontSize: '15px', fontWeight: 800 }}
                  onClick={() => {
                    if (!cliente) {
                      alert('Por favor selecciona un cliente de la ruta primero.');
                      return;
                    }
                    if ((cliente.currentBalance || 0) > 0) {
                      setDebtWarning(true);
                      return;
                    }
                    validateGeofence((lat, lng) => {
                      enviarPedido(photoBase64, lat, lng); 
                      setPhotoBase64(null);
                    });
                  }}
                >
                  ✅ Confirmar y Levantar Pedido
                </button>
              )}
            </>
          )}
        </div>

        {/* Acciones de Visita sin Venta / Contratiempo */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button 
            className="btn warning full" 
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '12px', padding: '8px' }} 
            onClick={() => {
              if (!cliente) {
                alert('Selecciona un cliente de la ruta primero.');
                return;
              }
              const reason = prompt("Motivo de No Venta (ej. Negocio Cerrado, Sin fondos, Inventario lleno):");
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
                alert('Visita sin venta registrada correctamente.');
                if (reloadState) reloadState();
                else window.location.reload(); 
              });
            }}
          >
            🚫 Visita sin Venta
          </button>
          <button 
            className="btn secondary full" 
            style={{ fontSize: '12px', padding: '8px' }}
            onClick={reportarContratiempo}
          >
            ⚠️ Reportar Incidencia
          </button>
        </div>
      </div>
    </div>
  );

  const renderCatalogoCard = () => (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>📦 Catálogo & Stock</h3>
        <input 
          className="input" 
          style={{ maxWidth: '160px', padding: '4px 10px', fontSize: '12px' }} 
          placeholder="🔍 Buscar..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>
      <div className="card-b list" style={{ flex: 1, overflowY: 'auto', maxHeight: isTouchAppMode ? 'calc(100vh - 220px)' : '720px' }}>
        {filtered.map(p => (
          <div 
            className="item" 
            key={p.id} 
            style={{ 
              padding: '10px 12px', 
              cursor: 'pointer',
              border: expandedId === p.id ? '1.5px solid var(--primary, #0056b3)' : '1px solid #e2e8f0',
              background: expandedId === p.id ? '#f8fafc' : '#ffffff',
              borderRadius: '8px',
              marginBottom: '6px'
            }} 
            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0].photoBase64} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <b style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '170px' }} title={p.name}>
                    {p.name}
                  </b>
                  <span className={`chip ${(p.availableStock || 0) <= 10 ? 'warn' : 'ok'}`} style={{ fontSize: '10px', padding: '1px 5px' }}>
                    Stock: {p.availableStock || 0}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {almacen(p.warehouseId)?.name || 'Almacén'} {p.sku ? `· SKU: ${p.sku}` : ''}
                </div>
                
                {/* Detalle Desplegable con Precios */}
                {expandedId === p.id && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                      <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <div className="muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Unidad</div>
                        <b style={{ color: 'var(--primary, #0056b3)', fontSize: '12px' }}>{pesos(p.price)}</b>
                      </div>
                      <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <div className="muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Mayoreo</div>
                        <b style={{ color: '#0f172a', fontSize: '12px' }}>{pesos(p.volumePrice || p.price)}</b>
                      </div>
                      <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <div className="muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Caja ({p.unitsPerBox || 1})</div>
                        <b style={{ color: 'var(--success, #16a34a)', fontSize: '12px' }}>{pesos(p.boxPrice || (p.price * (p.unitsPerBox || 1)))}</b>
                      </div>
                    </div>
                    <button 
                      className="btn success full" 
                      style={{ padding: '6px', fontSize: '12px', fontWeight: 800 }} 
                      onClick={() => {
                        addCart(p.id, 1, false);
                        if (isTouchAppMode) setMobileTab('pedido');
                      }}
                    >
                      ➕ Agregar al Pedido
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="vendedor-wrapper" style={{ width: '100%' }}>
      {/* Selector de Pestañas Móviles / PWA (solo en pantallas pequeñas o PWA táctil) */}
      {isTouchAppMode && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          marginBottom: '12px',
          background: '#ffffff',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <button 
            className={`btn ${mobileTab === 'ruta' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            onClick={() => setMobileTab('ruta')}
          >
            <span>📍 Ruta</span>
            <span style={{ fontSize: '10px', opacity: 0.85 }}>({visitedCount}/{totalCount})</span>
          </button>
          <button 
            className={`btn ${mobileTab === 'pedido' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            onClick={() => setMobileTab('pedido')}
          >
            <span>🛒 Pedido</span>
            <span style={{ fontSize: '10px', opacity: 0.85 }}>({cart.length} arts)</span>
          </button>
          <button 
            className={`btn ${mobileTab === 'catalogo' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            onClick={() => setMobileTab('catalogo')}
          >
            <span>📦 Catálogo</span>
            <span style={{ fontSize: '10px', opacity: 0.85 }}>Stock</span>
          </button>
        </div>
      )}

      {/* Render condicional para Móvil vs Desktop Panorámico */}
      {isTouchAppMode ? (
        <div style={{ width: '100%' }}>
          {mobileTab === 'ruta' && renderRutaCard()}
          {mobileTab === 'pedido' && renderPedidoCard()}
          {mobileTab === 'catalogo' && renderCatalogoCard()}
        </div>
      ) : (
        /* Layout Panorámico de 3 Columnas Proporcionadas en Escritorio */
        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth > 1360 ? '320px 1.2fr 340px' : '300px 1fr',
          gap: '16px',
          alignItems: 'start'
        }}>
          <div>{renderRutaCard()}</div>
          <div>{renderPedidoCard()}</div>
          {windowWidth > 1360 ? (
            <div>{renderCatalogoCard()}</div>
          ) : (
            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              {renderCatalogoCard()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
