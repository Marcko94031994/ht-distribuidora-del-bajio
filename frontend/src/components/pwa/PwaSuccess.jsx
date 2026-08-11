import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function PwaSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const isOffline = orderId?.startsWith('OFFLINE-');

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

      <button className="pwa-btn" onClick={() => navigate('/pwa')}>
        Volver al inicio
      </button>
    </div>
  );
}

export default PwaSuccess;
