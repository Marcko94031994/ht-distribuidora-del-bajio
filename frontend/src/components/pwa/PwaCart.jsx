import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function PwaCart({ clients, cart, setCart, data, user, route, reloadState }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const client = clients.find(c => c.id === Number(clientId));
  if (!client) return <div style={{padding: '20px'}}>Cliente no encontrado.</div>;

  const isOverdue = (client.overdueBalance || 0) > 0;

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    const prod = data.productos?.find(p => p.id === item.productId);
    const cp = data.preciosEspeciales?.find(cp => cp.clientId === client.id && cp.productId === item.productId);
    const price = cp ? cp.specialPrice : (prod?.price || 0);
    return sum + (price * item.quantity);
  }, 0);
  
  const discount = 0; // Or calculate based on client rules
  const subtotalAfterDiscount = subtotal - discount;
  const taxes = subtotalAfterDiscount * 0.16; // 16% IVA
  const total = subtotalAfterDiscount + taxes;

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    
    // Construct Order Payload
    const items = cart.map(item => {
      const prod = data.productos?.find(p => p.id === item.productId);
      const cp = data.preciosEspeciales?.find(cp => cp.clientId === client.id && cp.productId === item.productId);
      const price = cp ? cp.specialPrice : (prod?.price || 0);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: price,
        discountPercentage: 0,
        subtotal: price * item.quantity
      };
    });

    const payload = {
      clientId: client.id,
      routeId: route?.id,
      sucursalId: user?.sucursalId || 1,
      totalAmount: total,
      paymentMethod: client.creditLimit > 0 ? 'Crédito' : 'Contado',
      status: 'Capturado', // Backend should override to 'Pend. autorización' if overdue, or we can send it explicitly
      items: items,
      offline: !navigator.onLine // Flag if we want backend to know, though standard fetch will fail offline
    };

    try {
      if (!navigator.onLine) {
        // Handle Offline Mode
        const offlineQueue = JSON.parse(localStorage.getItem('ht_offline_orders') || '[]');
        offlineQueue.push({ ...payload, tempId: Date.now() });
        localStorage.setItem('ht_offline_orders', JSON.stringify(offlineQueue));
        
        // Mark client visited locally
        client.isVisited = true; // Mutating for current session
        
        setCart([]); // Clear cart
        navigate(`/pwa/exito/OFFLINE-${Date.now()}`);
        return;
      }

      const token = localStorage.getItem('ht_token');
      const response = await fetch('/api/app/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setCart([]);
        if (reloadState) reloadState();
        navigate(`/pwa/exito/${result.orderId || result.id || 'NUEVO'}`);
      } else {
        alert('Error al guardar el pedido.');
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      // Fallback to offline on fetch fail
      const offlineQueue = JSON.parse(localStorage.getItem('ht_offline_orders') || '[]');
      offlineQueue.push({ ...payload, tempId: Date.now() });
      localStorage.setItem('ht_offline_orders', JSON.stringify(offlineQueue));
      setCart([]);
      navigate(`/pwa/exito/OFFLINE-${Date.now()}`);
    }
  };

  return (
    <div>
      <div className="pwa-back-header">
        <Link to={`/pwa/cliente/${client.id}/catalogo`} className="pwa-back-btn">‹</Link>
        <div className="pwa-back-title">
          <div className="pwa-header-subtitle">Resumen del pedido</div>
          <div style={{fontSize: '1.4rem', fontWeight: 900}}>Verificar y Confirmar</div>
        </div>
      </div>

      {isOverdue && (
        <div className="pwa-alert">
          <div>⚠️</div>
          <div>Alerta de crédito: Cliente con documentos vencidos. El pedido pasará a un estado de <strong>"Pendiente de autorización"</strong> y no se surtirá hasta ser liberado por un administrador.</div>
        </div>
      )}

      <div className="pwa-list">
        {cart.map(item => {
          const prod = data.productos?.find(p => p.id === item.productId);
          const cp = data.preciosEspeciales?.find(cp => cp.clientId === client.id && cp.productId === item.productId);
          const price = cp ? cp.specialPrice : (prod?.price || 0);
          
          return (
            <div className="pwa-product-row" style={{alignItems: 'center', padding: '10px 12px'}} key={item.productId}>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 800, fontSize: '0.9rem', marginBottom: '2px'}}>{item.quantity} x {prod?.name}</div>
                <div style={{fontSize: '0.75rem', color: '#78685e'}}>${price.toFixed(2)} unitario</div>
              </div>
              <div style={{fontWeight: 900, fontSize: '1.05rem'}}>
                ${(price * item.quantity).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pwa-totals-box">
        <div className="pwa-total-row">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
        <div className="pwa-total-row">
          <span>IVA (16%)</span>
          <span>${taxes.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
        
        <div className="pwa-total-final">
          <span>Total del Pedido</span>
          <span>${total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      <div className="pwa-conditions-grid">
        <div className="pwa-condition-card">
          <div className="pwa-condition-label">CONDICIÓN DE PAGO</div>
          <div className="pwa-condition-val">{client.creditLimit > 0 ? 'Crédito 30 días' : 'Pago contra entrega'}</div>
        </div>
        <div className="pwa-condition-card">
          <div className="pwa-condition-label">ENTREGA</div>
          <div className="pwa-condition-val">Siguiente visita</div>
        </div>
      </div>

      <div style={{padding: '20px 20px 100px 20px'}}>
        <button 
          className="pwa-btn" 
          onClick={handleConfirmOrder} 
          disabled={isSubmitting || cart.length === 0}
          style={{opacity: isSubmitting ? 0.7 : 1}}
        >
          {isSubmitting ? 'Procesando...' : (isOverdue ? 'Confirmar Pedido (Requiere Autorización)' : 'Confirmar Pedido Seguro')}
        </button>
      </div>
    </div>
  );
}

export default PwaCart;
