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
  const [successOrder, setSuccessOrder] = useState(null);

  // Fetch ruta óptima de OSRM
  useEffect(() => {
    const list = ruta?.clientes || ruta?.clients || [];
    if (ruta && list.length > 1) {
      const coordinates = list.map(c => `${c.longitude || -101.6826},${c.latitude || 21.1213}`).join(';');
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
    const list = ruta?.clientes || ruta?.clients || [];
    if (ruta && list.length > 0) {
      return [list[0].latitude || 21.1213, list[0].longitude || -101.6826];
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
    const list = ruta?.clientes || ruta?.clients || [];
    if (!clientSearch) return list;
    const term = clientSearch.toLowerCase();
    return list.filter(c => 
      c.name?.toLowerCase().includes(term) || 
      c.zone?.toLowerCase().includes(term) ||
      c.rfc?.toLowerCase().includes(term)
    );
  }, [ruta?.clientes, ruta?.clients, clientSearch]);

  const visitedCount = (ruta?.clientes || ruta?.clients || []).filter(c => c.isVisited).length;
  const totalCount = (ruta?.clientes || ruta?.clients || []).length;
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
  const renderRutaCard = () => {
    const todayOrders = (data.pedidos || []).filter(p => p.routeId === ruta?.id && new Date(p.createdAt || new Date()).toDateString() === new Date().toDateString());
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const overdueClientsCount = (ruta?.clientes || ruta?.clients || []).filter(c => (c.currentBalance || 0) > 0).length;

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header (Greeting) */}
        <div style={{ padding: '0 10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long' })} · Ruta {ruta.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#2e1e1a' }}>
              Hola, {vendedor(ruta.driverId)?.name?.split(' ')[0] || 'Arturo'} 👋
            </h2>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '15px' }}>
              {(vendedor(ruta.driverId)?.name || 'A C').substring(0,2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Resumen del día */}
        <div style={{ 
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 60%, #831015 100%)', 
          borderRadius: '24px', 
          padding: '20px', 
          margin: '16px 0',
          color: '#ffffff',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(216,25,33,0.25)', filter: 'blur(30px)', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>Resumen del día</div>
          <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px' }}>
            {pesos(todaySales)}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '20px' }}>Venta levantada hoy</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>{todayOrders.length}</div>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>Pedidos</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>{totalCount}</div>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>Clientes</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>{overdueClientsCount}</div>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>Vencidos</div>
            </div>
          </div>
          </div>
        </div>

        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text)', marginBottom: '12px', padding: '0 10px' }}>
          Selecciona el cliente
        </div>

        {/* Client List */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: isTouchAppMode ? 'calc(100vh - 420px)' : '720px', padding: '0 10px' }}>
          <input
            type="text"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              fontSize: '14px', 
              marginBottom: '16px',
              outline: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
            placeholder="🔍 Buscar por nombre, RFC o código..."
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
          />
          
          {filteredClients.map((c, index) => {
            const isSelected = cliente?.id === c.id;
            const hasDebt = (c.currentBalance || 0) > 0;
            const hasCredit = (c.creditLimit || 0) > 0;

            let tagStyle = { background: '#dcfce7', color: '#166534' }; // Al corriente
            let tagText = 'Al corriente';
            if (hasDebt) {
              tagStyle = { background: '#fee2e2', color: '#991b1b' };
              tagText = 'Saldo vencido';
            } else if (hasCredit) {
              tagStyle = { background: '#ffedd5', color: '#9a3412' };
              tagText = 'Crédito';
            }

            return (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedCliente(c.id);
                  if (isTouchAppMode) setMobileTab('pedido');
                }}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '16px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid #f1f5f9',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#2e1e1a' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      CLI-{c.id.toString().padStart(5, '0')} · {c.zone || 'León, Gto.'}
                    </div>
                  </div>
                  <div style={{
                    background: tagStyle.background,
                    color: tagStyle.color,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {tagText}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Última compra: hace {Math.floor(Math.random() * 10) + 1} días
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>
                    Ver cliente →
                  </div>
                </div>
              </div>
            );
          })}
          {filteredClients.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
              No se encontraron clientes
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPedidoCard = () => {
    // Determine price list
    const clientPriceListId = data.preciosEspeciales?.find(cp => cp.clientId === cliente?.id)?.priceListId;
    const priceListName = clientPriceListId ? 'ESPECIAL' : 'MAYOREO B'; // Mocked fallback
    const isOverdue = cliente && (cliente.overdueBalance || cliente.currentBalance || 0) > 0;
    const creditLimit = cliente?.creditLimit || 0;
    const overdueBalance = cliente?.overdueBalance || cliente?.currentBalance || 0;
    const availableCredit = creditLimit - overdueBalance;
    
    // Calcular totales del carrito
    const subtotal = cart.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.cantidad || 0)), 0);
    const discount = 0;
    const subtotalAfterDiscount = subtotal - discount;
    const taxes = 0; // Se ajusta a 0 basado en mockup
    const total = subtotalAfterDiscount + taxes;

    const handleConfirmOrder = async (photoBase64, lat, lng) => {
       const res = await enviarPedido(photoBase64, lat, lng);
       if (res && res.success) {
         setSuccessOrder({
           id: res.orderId,
           clientName: cliente.name,
           total: total,
           offline: res.offline,
           isOverdue: isOverdue
         });
       }
    };

    if (successOrder) {
      return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc', position: 'relative' }}>
          <div style={{ background: '#ecfdf5', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '40px', color: '#059669' }}>✓</span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#2e1e1a', marginBottom: '8px' }}>Pedido registrado</h2>
          <p className="muted" style={{ fontSize: '14px', textAlign: 'center', marginBottom: '32px', maxWidth: '300px' }}>
            {successOrder.offline ? 'Sin conexión. El pedido se enviará al recuperar señal.' : 'La información quedó guardada y ya puede consultarse desde administración.'}
          </p>

          <div style={{ background: '#ffffff', width: '100%', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="muted" style={{ fontSize: '13px' }}>Folio</span>
              <span style={{ fontWeight: 800, color: '#2e1e1a', fontSize: '15px' }}>{successOrder.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="muted" style={{ fontSize: '13px' }}>Cliente</span>
              <span style={{ fontWeight: 800, color: '#2e1e1a', fontSize: '15px' }}>{successOrder.clientName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="muted" style={{ fontSize: '13px' }}>Total</span>
              <span style={{ fontWeight: 900, color: '#2e1e1a', fontSize: '15px' }}>{pesos(successOrder.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: '13px' }}>Estatus</span>
              <span style={{ 
                background: successOrder.isOverdue ? '#fdf2f8' : '#ecfdf5', 
                color: successOrder.isOverdue ? '#be185d' : '#059669', 
                padding: '6px 12px', 
                borderRadius: '20px', 
                fontSize: '11px', 
                fontWeight: 800 
              }}>
                {successOrder.isOverdue ? 'Pend. autorización' : 'Capturado'}
              </span>
            </div>
          </div>

          <button 
            style={{ width: '100%', padding: '18px', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 900, cursor: 'pointer', marginBottom: '12px' }}
            onClick={() => {
              setSuccessOrder(null);
              setSelectedCliente(null);
              setMobileTab('ruta');
            }}
          >
            Nuevo pedido
          </button>
          <button 
            style={{ width: '100%', padding: '18px', background: '#ffffff', color: '#2e1e1a', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '16px', fontWeight: 900, cursor: 'pointer' }}
            onClick={() => {
              window.location.reload();
            }}
          >
            Volver a inicio
          </button>
        </div>
      );
    }

    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* State: Sin cliente seleccionado */}
        {!cliente ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
            <h3 style={{ fontSize: '1.2rem', color: '#1e293b' }}>Selecciona un cliente</h3>
            <p className="muted" style={{ fontSize: '13px', maxWidth: '250px' }}>
              Selecciona un cliente de la ruta para ver sus detalles y comenzar a levantar el pedido.
            </p>
          </div>
        ) : (
          <div className="card-b" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            
            {/* Header: Cliente Seleccionado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button 
                onClick={() => setSelectedCliente(null)}
                style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#ffffff', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              >
                ‹
              </button>
              <div>
                <div style={{ fontSize: '12px', color: '#78685e', fontWeight: 800 }}>Cliente seleccionado</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#2e1e1a' }}>{cliente.name}</div>
              </div>
            </div>

            {/* Tarjeta de Crédito / Adeudo */}
            <div style={{ border: isOverdue ? '1px solid #fecaca' : '1px solid #e2e8f0', borderRadius: '24px', padding: '20px', marginBottom: '16px', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                {isOverdue ? (
                  <div style={{ background: '#fdf2f8', color: '#be185d', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                    ⚠️ Saldo vencido
                  </div>
                ) : creditLimit > 0 ? (
                  <div style={{ background: '#ffedd5', color: '#9a3412', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                    Crédito Activo
                  </div>
                ) : (
                  <div style={{ background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                    Contado
                  </div>
                )}
                <div style={{ fontSize: '13px', color: '#78685e' }}>
                  {creditLimit > 0 ? 'Crédito 30 días' : 'Pago contra entrega'}
                </div>
              </div>

              {isOverdue ? (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#2e1e1a', letterSpacing: '-1px' }}>
                    {pesos(overdueBalance)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#78685e' }}>Vencido desde hace 13 días</div>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#78685e' }}>Estado de cuenta</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#047857' }}>Al corriente</div>
                </div>
              )}

              {creditLimit > 0 && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, background: '#f0ebe4', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#78685e', fontWeight: 600, marginBottom: '6px' }}>Límite de crédito</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#2e1e1a' }}>{pesos(creditLimit)}</div>
                  </div>
                  <div style={{ flex: 1, background: '#f0ebe4', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#78685e', fontWeight: 600, marginBottom: '6px' }}>Disponible</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#2e1e1a' }}>{pesos(Math.max(0, availableCredit))}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Alerta de Documentos Vencidos */}
            {isOverdue && (
              <div style={{ background: '#fdf2f8', color: '#9f1239', padding: '16px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                <div>⚠️</div>
                <div>Este cliente tiene {pesos(overdueBalance)} vencidos. El pedido se guardará como <strong>pendiente de autorización</strong>.</div>
              </div>
            )}

            {/* Información Comercial */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '24px', padding: '20px', marginBottom: '20px', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#2e1e1a' }}>Información comercial</div>
                <div style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>Activo</div>
              </div>
              <div style={{ fontSize: '13px', color: '#78685e', marginTop: '4px', marginBottom: '20px' }}>
                Lista: {priceListName} · Vendedor: {vendedor(ruta.driverId)?.name?.split(' ')[0] || 'Arturo'}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => openNavigationApp(cliente)}
                  style={{ flex: 1, padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 800, color: '#2e1e1a', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                >
                  📍 Ubicación
                </button>
                <button 
                  style={{ flex: 1, padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 800, color: '#2e1e1a', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                >
                  📄 Estado de cuenta
                </button>
              </div>
            </div>

            {/* CARRITO DE PRODUCTOS (SI HAY PRODUCTOS) */}
            {cart.length > 0 ? (
              <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '24px', marginTop: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#2e1e1a', marginBottom: '16px' }}>Resumen del pedido</h3>
                
                {/* Lista de productos */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '8px', marginBottom: '16px' }}>
                  {cart.map((l, i) => {
                    const p = producto(l.productoId);
                    const sub = (l.unitPrice || 0) * (l.cantidad || 0);
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: i < cart.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#2e1e1a' }}>{p?.name}</div>
                          <div style={{ fontSize: '13px', color: '#78685e' }}>{l.cantidad} {l.isBox ? 'Caja(s)' : 'Pza(s)'} × {pesos(l.unitPrice)}</div>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#2e1e1a' }}>
                          {pesos(sub)}
                          <button onClick={() => setCart(c => c.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', marginLeft: '10px', cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Condiciones */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#2e1e1a', marginBottom: '16px' }}>Condiciones</div>
                  <div style={{ background: '#f0ebe4', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#78685e', fontWeight: 800 }}>Lista de precio aplicada</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#2e1e1a' }}>{priceListName}</div>
                  </div>
                  <div style={{ background: '#f0ebe4', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#78685e', fontWeight: 800 }}>Forma de pago</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#2e1e1a' }}>{creditLimit > 0 ? 'Crédito · 30 días' : 'Contado'}</div>
                  </div>
                </div>

                {/* Total Dark Card */}
                <div style={{ background: '#111827', borderRadius: '24px', padding: '24px', color: '#ffffff', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ opacity: 0.9 }}>Subtotal</span>
                    <span style={{ fontWeight: 800 }}>{pesos(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                    <span style={{ opacity: 0.9 }}>IVA</span>
                    <span style={{ fontWeight: 800 }}>{pesos(taxes)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900 }}>Total</span>
                    <span style={{ fontSize: '24px', fontWeight: 900 }}>{pesos(total)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    validateGeofence((lat, lng) => {
                      handleConfirmOrder(photoBase64, lat, lng);
                      setPhotoBase64(null);
                    });
                  }}
                  style={{ width: '100%', padding: '20px', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '20px', fontSize: '18px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 16px rgba(216,25,33,0.25)' }}
                >
                  Confirmar pedido
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '24px' }}>
                <button 
                  onClick={() => {
                    if (isTouchAppMode) setMobileTab('catalogo');
                    else document.querySelector('input[placeholder="🔍 Buscar..."]')?.focus();
                  }}
                  style={{ width: '100%', padding: '20px', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '20px', fontSize: '18px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 16px rgba(216,25,33,0.25)' }}
                >
                  Levantar pedido
                </button>

                {/* Acciones Secundarias */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => {
                      const reason = prompt("Motivo de No Venta (ej. Negocio Cerrado, Sin fondos):");
                      if (!reason) return;
                      validateGeofence(async (lat, lng) => {
                        const token = localStorage.getItem('ht_token');
                        await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/visit', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ 
                            clientId: cliente.id, driverId: ruta.driverId, saleAccomplished: false, noSaleReason: reason, latitude: lat, longitude: lng
                          })
                        });
                        alert('Visita sin venta registrada correctamente.');
                        if (reloadState) reloadState(); else window.location.reload(); 
                      });
                    }}
                    style={{ flex: 1, padding: '14px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '16px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    🚫 Visita sin Venta
                  </button>
                  <button 
                    onClick={reportarContratiempo}
                    style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ⚠️ Contratiempo
                  </button>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    );
  };

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
