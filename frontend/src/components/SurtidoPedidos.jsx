import React, { useState, useEffect } from 'react';
import { pesos, printRemision } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

export default function SurtidoPedidos({ data, reloadState }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [fulfillItems, setFulfillItems] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterSeller, setFilterSeller] = useState('');

  useEffect(() => {
    fetchPendingOrders();
  }, [data.pedidos]);

  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (!updated) {
        setSelectedOrder(null);
      } else if (JSON.stringify(updated.items) !== JSON.stringify(selectedOrder.items)) {
        setSelectedOrder(updated);
        setFulfillItems(prev => {
          const newInitial = { ...prev };
          (updated.items || []).forEach(item => {
            if (newInitial[item.id] === undefined) {
              newInitial[item.id] = item.quantity;
            }
          });
          return newInitial;
        });
      }
    }
  }, [orders, selectedOrder]);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data || []);
        // Filtrar solo los pendientes
        const pending = items.filter(o => o.status === 'Pendiente' || o.status === 'Esperando Autorización Admin');
        setOrders(pending);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openOrder = (o) => {
    setSelectedOrder(o);
    // Inicializar cantidades a surtir con lo pedido originalmente
    const initialItems = {};
    (o.items || []).forEach(item => {
      initialItems[item.id] = item.quantity;
    });
    setFulfillItems(initialItems);
    setSelectedVehicle(o.vehicleId || '');
  };

  const handleItemChange = (itemId, val) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 0) num = 0;
    
    // No permitir surtir más de lo que pidieron
    const originalQty = selectedOrder.items.find(i => i.id === itemId)?.quantity || 0;
    if (num > originalQty) num = originalQty;

    setFulfillItems(prev => ({
      ...prev,
      [itemId]: num
    }));
  };

  const handleFulfill = async () => {
    if (!selectedVehicle) {
      alert("Debes asignar una Unidad/Vehículo para el despacho.");
      return;
    }

    const payload = {
      vehicleId: Number(selectedVehicle),
      items: Object.keys(fulfillItems).map(id => ({
        id: Number(id),
        productId: selectedOrder.items.find(i => i.id === Number(id))?.productId || 0,
        fulfillQuantity: fulfillItems[id]
      }))
    };

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/order/${selectedOrder.id}/fulfill`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡Pedido surtido y despachado con éxito!");
        setSelectedOrder(null);
        fetchPendingOrders();
        if (typeof reloadState === 'function') reloadState();
      } else {
        const text = await res.text();
        alert("Error al surtir: " + text);
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && orders.length === 0) {
    return <div style={{ padding: '20px' }}>Cargando pedidos...</div>;
  }

  const filteredOrders = orders.filter(o => {
    if (filterDateFrom || filterDateTo) {
      const oDate = new Date(o.date).toISOString().split('T')[0];
      if (filterDateFrom && oDate < filterDateFrom) return false;
      if (filterDateTo && oDate > filterDateTo) return false;
    }
    if (filterRoute && String(o.routeId) !== filterRoute) return false;
    if (filterSeller && String(o.driverId) !== filterSeller) return false;
    return true;
  });

  return (
    <div className="view-container animate-fade-in">
      <div className="glass" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>📦 Surtido de Pedidos</h2>
        <p className="muted" style={{ margin: 0 }}>Autoriza cantidades, empaca y asigna unidad de despacho.</p>
      </div>

      {!selectedOrder && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-b" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="field" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
              <label>Fecha Desde</label>
              <input 
                type="date" 
                className="input" 
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
              <label>Fecha Hasta</label>
              <input 
                type="date" 
                className="input" 
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Ruta</label>
              <select className="select" value={filterRoute} onChange={e => setFilterRoute(e.target.value)}>
                <option value="">Todas las rutas</option>
                {(data?.rutas || []).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Vendedor</label>
              <select className="select" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
                <option value="">Todos los vendedores</option>
                {(data?.vendedores || []).map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn secondary" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterRoute(''); setFilterSeller(''); }}>
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder ? (
        <div className="card animate-fade-in">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Surtir Pedido {selectedOrder.orderNumber}</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn secondary" onClick={() => {
                const currentCliente = selectedOrder.client || data?.rutas?.flatMap(r => r.clients).find(c => c.id === selectedOrder.clientId);
                printRemision(selectedOrder, currentCliente, selectedOrder.items, data);
              }}>
                🖨️ Imprimir Remisión
              </button>
              <button className="btn secondary" onClick={() => setSelectedOrder(null)}>⬅ Volver a la Lista</button>
            </div>
          </div>
          <div className="card-b">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                <strong>Cliente:</strong> {selectedOrder.client?.tradeName || selectedOrder.client?.name || data?.rutas?.flatMap(r => r.clients).find(c => c.id === selectedOrder.clientId)?.name || `ID: ${selectedOrder.clientId}`} <br/>
                <strong>Fecha:</strong> {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : `${new Date(selectedOrder.date).toLocaleDateString()} ${selectedOrder.time || ''}`} <br/>
                <strong>Total Original:</strong> {pesos(selectedOrder.totalAmount)}
              </p>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Unidad de Despacho (Vehículo) *</label>
                <SearchableSelect 
                  options={(data.unidades || []).map(v => ({ value: v.id, label: `${v.brand} ${v.model} - ${v.plateNumber}` }))}
                  value={selectedVehicle}
                  onChange={(val) => setSelectedVehicle(val)}
                  placeholder="Selecciona vehículo..."
                />
              </div>
            </div>

            <table className="table" style={{ width: '100%', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio Unit.</th>
                  <th>Cant. Pedida</th>
                  <th style={{ background: '#fef2f2' }}>Cant. a Surtir</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map(item => {
                  const toFulfill = fulfillItems[item.id] !== undefined ? fulfillItems[item.id] : item.quantity;
                  const isPartial = toFulfill < item.quantity;
                  const isZero = toFulfill === 0;
                  
                  return (
                    <tr key={item.id} style={{ opacity: isZero ? 0.5 : 1 }}>
                      <td>
                        <strong>{item.product?.name || data?.productos?.find(p => p.id === item.productId)?.name || `Prod ID: ${item.productId}`}</strong>
                        {isPartial && !isZero && <span style={{ marginLeft: '10px', fontSize: '11px', background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px' }}>Incompleto</span>}
                        {isZero && <span style={{ marginLeft: '10px', fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px' }}>Cancelado</span>}
                      </td>
                      <td>{pesos(item.unitPrice)}</td>
                      <td>{item.quantity}</td>
                      <td style={{ background: '#fef2f2' }}>
                        <input 
                          type="number" 
                          min="0"
                          max={item.quantity}
                          className="input" 
                          style={{ width: '80px', textAlign: 'center', borderColor: isPartial ? '#ef4444' : '#e2e8f0' }}
                          value={toFulfill}
                          onChange={(e) => handleItemChange(item.id, e.target.value)}
                        />
                      </td>
                      <td>{pesos(toFulfill * item.unitPrice)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button className="btn secondary" onClick={() => setSelectedOrder(null)}>Cancelar</button>
              <button 
                className="btn primary" 
                onClick={handleFulfill}
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Procesando...' : '✅ Confirmar Surtido y Despachar'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-b">
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <span style={{ fontSize: '40px' }}>📦</span>
                <p>No hay pedidos pendientes que coincidan con los filtros.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {filteredOrders.map(o => (
                  <div key={o.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{o.orderNumber}</strong>
                      <span className="badge warning">Pendiente</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '15px' }}>
                      <div><strong>Cliente:</strong> {o.client?.tradeName || o.client?.name || data?.rutas?.flatMap(r => r.clients).find(c => c.id === o.clientId)?.name || `ID: ${o.clientId}`}</div>
                      <div><strong>Fecha:</strong> {new Date(o.date).toLocaleDateString()} {o.time}</div>
                      <div><strong>Artículos:</strong> {o.items?.length || 0} líneas</div>
                    </div>
                    <button className="btn primary" style={{ width: '100%' }} onClick={() => openOrder(o)}>
                      Revisar y Surtir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
