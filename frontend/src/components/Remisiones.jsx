import { useState } from 'react';
import { pesos, printRemision } from '../utils/helpers';

export default function Remisiones({ data, pedido, setSelectedPedido, ruta, vendedor, producto, cambiarPedidoStatus, registrarDevolucion }) {
  const [photoBase64, setPhotoBase64] = useState(null);
  const [returnItems, setReturnItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDelivery = () => {
    cambiarPedidoStatus('Entregado', photoBase64);
    setPhotoBase64(null);
  };

  const handleReturn = () => {
    const reason = prompt("Razón de la devolución (ej: Producto dañado, Caducado):");
    if (!reason) return;
    
    const returns = Object.entries(returnItems).map(([productId, quantity]) => ({
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      reason: reason
    })).filter(r => r.quantity > 0);

    if (returns.length === 0) {
      alert("Debes ingresar la cantidad a devolver de al menos un producto.");
      return;
    }

    registrarDevolucion(returns);
    setReturnItems({});
  };

  const pedidosList = data.pedidos || [];
  const filteredPedidos = pedidosList.filter(p => {
    if (p.status === 'Pendiente' || p.status === 'Esperando Autorización Admin' || p.status === 'Cancelado') return false;

    if (filterStatus && p.status !== filterStatus) return false;
    
    if (filterDateFrom || filterDateTo) {
      const pDate = new Date(p.date).toISOString().split('T')[0];
      if (filterDateFrom && pDate < filterDateFrom) return false;
      if (filterDateTo && pDate > filterDateTo) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const rutaName = ruta(p.routeId)?.name || '';
      if (!((p.orderNumber && p.orderNumber.toLowerCase().includes(term)) ||
          (p.status && p.status.toLowerCase().includes(term)) ||
          rutaName.toLowerCase().includes(term))) {
        return false;
      }
    }
    return true;
  });

  const activePedido = filteredPedidos.find(p => p.id === pedido?.id);
  const currentCliente = activePedido ? (data.rutas?.flatMap(r => r.clients) || []).find(x => x.id === activePedido.clientId) : null;
  const currentItems = activePedido?.items || [];

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Remisiones</h3>
            <span className="chip secondary">{filteredPedidos.length}</span>
          </div>
          <input 
            type="text" 
            className="input full" 
            placeholder="🔎 Buscar folio o ruta..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <input 
                type="date" 
                className="input" 
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
              <input 
                type="date" 
                className="input" 
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
            <div style={{ marginTop: '10px' }}>
              <select 
              className="select" 
              style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Todos los estatus</option>
              <option value="Surtido/En Tránsito">En Tránsito</option>
              <option value="Entregado">Entregado</option>
              <option value="Entregado con Devolución">Entregado con Dev</option>
            </select>
          </div>
        </div>
        <div className="card-b list">
          {filteredPedidos.map(p => (
            <div 
              className={'item ' + (pedido?.id === p.id ? 'active' : '')} 
              onClick={() => setSelectedPedido(p.id)} 
              key={p.id}
            >
              <div className="row">
                <b>{p.orderNumber || `Folio #${p.id}`}</b>
                <span className={'chip ' + (p.status === 'Entregado' ? 'ok' : p.status === 'Pendiente' ? 'warn' : p.status === 'Entregado con Devolución' ? 'danger' : '')}>
                  {p.status}
                </span>
              </div>
              <div className="muted">Ruta: {ruta(p.routeId)?.name || 'Sin ruta'}</div>
            </div>
          ))}
          {filteredPedidos.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>
              No se encontraron remisiones registradas.
            </div>
          )}
        </div>
      </div>

      <div className="card double">
        {activePedido ? (
          <>
            <div className="card-h">
              <h3>Detalle de {activePedido.orderNumber || `Pedido #${activePedido.id}`}</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                  onClick={() => {
                    const itemsTxt = currentItems.map(i => `${producto(i.productId)?.name || 'Prod'} x ${i.quantity} = ${pesos((producto(i.productId)?.price || 0) * i.quantity)}`).join('\n');
                    const total = currentItems.reduce((sum, i) => sum + ((producto(i.productId)?.price || 0) * i.quantity), 0);
                    const text = `🧾 *TICKET HT DISTRIBUIDORA*\n--------------------------\nFolio: ${activePedido.orderNumber || activePedido.id}\nCliente: ${currentCliente?.name || 'Cliente general'}\n\n${itemsTxt}\n\n*TOTAL: ${pesos(total)}*\n--------------------------\n¡Gracias por su compra!`;
                    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                >
                  📱 WhatsApp
                </button>
                <button 
                  className="btn secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                  onClick={() => printRemision(activePedido, currentCliente, currentItems, data)}
                >
                  🖨️ Imprimir Remisión
                </button>
                <div className="muted">{activePedido.time || ''} · {vendedor(activePedido.driverId)?.name || 'Sin Chofer'}</div>
              </div>
            </div>
            <div className="card-b">
              <p><b>Cliente:</b> {currentCliente?.name || 'No especificado'}</p>
              <p><b>Zona:</b> {currentCliente?.zone || 'N/A'}</p>
              <br/>
              <div className="cart-row cart-head">
                <div>Prod</div><div>Cant</div><div>Precio</div><div>Devolver</div>
              </div>
              {currentItems.map((i, idx) => {
                const prod = producto(i.productId);
                const locName = prod?.warehouseLocationId ? data.ubicaciones?.find(u => u.id === prod.warehouseLocationId)?.name : null;
                return (
                  <div className="cart-row" key={idx}>
                    <div>
                      {prod?.name || `Producto #${i.productId}`}
                      {locName && <div className="muted" style={{ fontSize: '0.75rem' }}>📍 {locName}</div>}
                    </div>
                    <div>{i.quantity}</div>
                    <div>{pesos(prod?.price || 0)}</div>
                    <div>
                      {(activePedido.status === 'En remisión' || activePedido.status === 'Surtido/En Tránsito') ? (
                        <input 
                          type="number" 
                          min="0" 
                          max={i.quantity} 
                          className="input" 
                          style={{ width: '60px' }}
                          value={returnItems[i.productId] || ''}
                          onChange={(e) => setReturnItems({ ...returnItems, [i.productId]: e.target.value })}
                        />
                      ) : '-'}
                    </div>
                  </div>
                );
              })}
              <br/>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {activePedido.status === 'Pendiente' && (
                  <button className="btn success" onClick={() => cambiarPedidoStatus('En remisión')}>
                    Autorizar y Despachar
                  </button>
                )}
                {(activePedido.status === 'En remisión' || activePedido.status === 'Surtido/En Tránsito') && (
                  <button className="btn secondary" onClick={() => cambiarPedidoStatus('Cancelado')}>
                    Cancelar Pedido
                  </button>
                )}
                {(activePedido.status === 'En remisión' || activePedido.status === 'Surtido/En Tránsito') && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <label className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>Evidencia de Entrega:</label>
                      <input type="file" accept="image/*" capture="environment" className="input full" onChange={handlePhoto} />
                    </div>
                    <button className="btn primary" onClick={handleDelivery}>Marcar Entregado</button>
                    <button className="btn danger" onClick={handleReturn}>Registrar Devolución Parcial</button>
                  </div>
                )}
              </div>
              {photoBase64 && (
                <img src={(photoBase64 && photoBase64.startsWith('uploads/')) ? '/' + photoBase64 : photoBase64} alt="Evidencia temp" style={{ width: '80px', height: '80px', objectFit: 'cover', marginTop: '1rem', borderRadius: '6px' }} />
              )}
              
              {activePedido.status === 'Entregado con Devolución' && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <h4 className="danger">Productos Devueltos:</h4>
                  {data.devoluciones?.filter(d => d.orderId === activePedido.id).map(d => (
                    <div key={d.id} className="item">
                      <div className="row">
                        <b>{producto(d.productId)?.name || `Prod #${d.productId}`}</b>
                        <span>Cant: {d.quantity}</span>
                        <span className="chip warn">{d.status}</span>
                      </div>
                      <div className="muted">Razón: {d.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {activePedido.deliveryPhotoBase64 && (
                <div style={{ marginTop: '1rem' }}>
                  <p><b>Foto de Entrega Guardada:</b></p>
                  <img src={(import.meta.env.VITE_API_URL || "") + activePedido.deliveryPhotoBase64} alt="Evidencia final" style={{ width: '200px', borderRadius: '8px' }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="card-h">
              <h3>Detalle de Remisión</h3>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--muted)', textAlign: 'center' }}>
              <span style={{ fontSize: '3.5rem', marginBottom: '12px' }}>📋</span>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--text)' }}>No hay remisión seleccionada</h4>
              <p style={{ margin: 0, maxWidth: '360px', fontSize: '0.9rem' }}>
                Selecciona una remisión de la lista izquierda para visualizar productos, autorizar despacho o gestionar entregas.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
