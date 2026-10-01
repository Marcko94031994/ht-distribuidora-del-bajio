import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

function PwaSuccess({ data }) {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { order, clientName } = location.state || {};

  const isOffline = orderId?.startsWith('OFFLINE-');

  const handleShareTicket = () => {
    if (!order) {
      alert("No hay detalles del pedido para generar el ticket.");
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar dimensiones
    canvas.width = 400;
    
    // Calcular altura dependiendo de los items
    const headerHeight = 160;
    const itemHeight = 30;
    const footerHeight = 100;
    canvas.height = headerHeight + (order.items.length * itemHeight) + footerHeight;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Textos
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    // Header
    ctx.font = 'bold 20px Arial';
    ctx.fillText('HT DISTRIBUIDORA DEL BAJIO', 200, 40);
    ctx.font = '14px Arial';
    ctx.fillText('Ticket de Pedido', 200, 65);
    
    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    ctx.fillText(`Folio: ${orderId}`, 20, 100);
    ctx.fillText(`Fecha: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}`, 20, 120);
    ctx.fillText(`Cliente: ${clientName || 'Público en general'}`, 20, 140);
    
    // Separador
    ctx.beginPath();
    ctx.moveTo(20, 150);
    ctx.lineTo(380, 150);
    ctx.stroke();

    // Items
    let y = 175;
    ctx.font = '12px Arial';
    order.items.forEach(item => {
      const prod = data?.productos?.find(p => p.id === item.productId);
      const name = prod ? prod.name.substring(0, 25) : `Producto #${item.productId}`;
      
      ctx.textAlign = 'left';
      ctx.fillText(`${item.quantity}x ${name}`, 20, y);
      
      ctx.textAlign = 'right';
      ctx.fillText(`$${(item.unitPrice * item.quantity).toFixed(2)}`, 380, y);
      y += itemHeight;
    });

    // Separador
    ctx.beginPath();
    ctx.moveTo(20, y - 10);
    ctx.lineTo(380, y - 10);
    ctx.stroke();

    // Totales
    y += 15;
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Total: $${(order.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 380, y);

    // Footer
    y += 40;
    ctx.textAlign = 'center';
    ctx.font = '12px Arial';
    ctx.fillText('¡Gracias por su preferencia!', 200, y);

    // Generar imagen y descargar
    const imgData = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imgData;
    a.download = `Ticket_${orderId}.png`;
    a.click();
  };

  return (
    <div className="pwa-success-screen">
      <div className="pwa-success-icon">
        {isOffline ? '💾' : '✅'}
      </div>
      
      <div className="pwa-success-title">
        {isOffline ? 'Pedido guardado' : '¡Pedido Confirmado!'}
      </div>
      
      <div className="pwa-success-subtitle">
        {isOffline 
          ? 'El pedido se ha guardado localmente y se sincronizará automáticamente en cuanto recuperes la conexión a internet.' 
          : 'El pedido se ha registrado correctamente en el sistema y está listo para ser despachado.'}
      </div>

      <div className="pwa-summary-card">
        <div className="pwa-summary-row">
          <span className="pwa-summary-label">Referencia</span>
          <span className="pwa-summary-val">{orderId}</span>
        </div>
        <div className="pwa-summary-row">
          <span className="pwa-summary-label">Fecha</span>
          <span className="pwa-summary-val">{new Date().toLocaleDateString('es-MX')}</span>
        </div>
        <div className="pwa-summary-row">
          <span className="pwa-summary-label">Estatus</span>
          <span className="pwa-summary-val" style={{color: isOffline ? '#b45309' : '#047857'}}>
            {isOffline ? 'Pendiente de sincronización' : 'Recibido'}
          </span>
        </div>
      </div>

      {order && (
        <button 
          className="pwa-btn" 
          onClick={handleShareTicket}
          style={{ background: '#25D366', color: '#fff', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          📷 Compartir Ticket
        </button>
      )}

      <button className="pwa-btn" onClick={() => navigate('/pwa')} style={{ background: '#f0ebe4', color: '#3d3028' }}>
        Volver al inicio
      </button>
    </div>
  );
}

export default PwaSuccess;
