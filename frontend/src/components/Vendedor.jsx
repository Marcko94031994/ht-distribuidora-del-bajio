import React, { useMemo, useState } from 'react';
import { pesos } from '../utils/helpers';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px'
};

export default function Vendedor({data,ruta,cliente,setSelectedCliente,vendedor,sucursal,producto,almacen,cart,setCart,addCart,enviarPedido,reportarContratiempo}){
  const [photoBase64, setPhotoBase64] = useState(null);
  const [isBox, setIsBox] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = (data.productos || []).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const center = useMemo(() => {
    if (ruta && ruta.clientes && ruta.clientes.length > 0) {
      return { lat: ruta.clientes[0].latitude || 21.1213, lng: ruta.clientes[0].longitude || -101.6826 };
    }
    return { lat: 21.1213, lng: -101.6826 };
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
          <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
            {!isLoaded ? (
              <div className="mini-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="muted">Cargando Google Maps...</div>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={13}
                options={{ disableDefaultUI: true }}
              >
                {(ruta.clientes || []).map((c, i) => (
                  <Marker
                    key={c.id}
                    position={{ lat: c.latitude || 21.1213, lng: c.longitude || -101.6826 }}
                    label={{ text: (i + 1).toString(), color: 'white', fontWeight: 'bold' }}
                    onClick={() => setSelectedCliente(c.id)}
                    icon={cliente?.id === c.id ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' : c.isVisited ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'}
                  />
                ))}
              </GoogleMap>
            )}
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
            <button className="btn" onClick={() => addCart(isBox)}>Agregar</button>
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
              <button className="btn success" onClick={() => { 
                navigator.geolocation.getCurrentPosition((pos) => {
                  enviarPedido(photoBase64, pos.coords.latitude, pos.coords.longitude); 
                  setPhotoBase64(null);
                }, () => enviarPedido(photoBase64, 0, 0));
              }}>Enviar a remisiones</button>
            </>}
          </div>
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--line)', paddingTop: '20px', display: 'grid', gap: '10px' }}>
            <button className="btn warning full" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => {
              const reason = prompt("Motivo de No Venta (ej. Cerrado, No hay dinero, Falta Stock):");
              if (!reason) return;
              navigator.geolocation.getCurrentPosition(async (pos) => {
                const token = localStorage.getItem('ht_token');
                await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/visit', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                   body: JSON.stringify({ 
                     clientId: cliente.id, 
                     driverId: ruta.driverId, 
                     saleAccomplished: false, 
                     noSaleReason: reason,
                     latitude: pos.coords.latitude,
                     longitude: pos.coords.longitude
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
                    <span className={'chip '+(p.stock<=10?'warn':'ok')}>{p.stock} pzas</span>
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
                      <button className="btn success full" style={{ marginTop: '0.8rem' }} onClick={() => addCart(p)}>Agregar al Pedido</button>
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
