import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function PwaClientDetails({ clients, data, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const client = clients.find(c => c.id === Number(id));
  if (!client) return <div style={{padding: '20px'}}>Cliente no encontrado.</div>;

  const isOverdue = (client.overdueBalance || 0) > 0;
  const creditLimit = client.creditLimit || 0;
  const overdueBalance = client.overdueBalance || 0;
  const availableCredit = creditLimit - overdueBalance; // Simple approx

  // Find price list name if any
  const clientPriceListId = data.preciosEspeciales?.find(cp => cp.clientId === client.id)?.priceListId;
  const priceListName = clientPriceListId ? 'ESPECIAL' : 'MAYOREO B'; // Mocked fallback

  return (
    <div>
      <div className="pwa-back-header">
        <Link to="/pwa" className="pwa-back-btn">‹</Link>
        <div className="pwa-back-title">
          <div className="pwa-header-subtitle">Cliente seleccionado</div>
          <div style={{fontSize: '1.4rem', fontWeight: 900}}>{client.name}</div>
        </div>
      </div>

      <div className="pwa-card" style={{margin: '0 20px 16px 20px', border: '1px solid #fecaca'}}>
        <div className="pwa-card-row" style={{marginBottom: '16px'}}>
          {isOverdue ? (
            <span className="pwa-pill danger">⚠️ Saldo vencido</span>
          ) : creditLimit > 0 ? (
            <span className="pwa-pill warning">Crédito Activo</span>
          ) : (
            <span className="pwa-pill default">Contado</span>
          )}
          <span style={{fontSize: '0.8rem', color: '#78685e'}}>
            {creditLimit > 0 ? 'Crédito 30 días' : 'Pago contra entrega'}
          </span>
        </div>

        {isOverdue ? (
          <>
            <div style={{fontSize: '2rem', fontWeight: 900, marginBottom: '4px'}}>
              ${overdueBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}
            </div>
            <div style={{fontSize: '0.85rem', color: '#78685e', marginBottom: '20px'}}>
              Vencido desde hace 13 días
            </div>
          </>
        ) : (
          <div style={{marginBottom: '20px'}}>
            <div style={{fontSize: '0.85rem', color: '#78685e'}}>Estado de cuenta</div>
            <div style={{fontSize: '1.2rem', fontWeight: 900, color: '#047857'}}>Al corriente</div>
          </div>
        )}

        {creditLimit > 0 && (
          <div style={{display: 'flex', gap: '12px'}}>
            <div style={{flex: 1, background: '#f0ebe4', borderRadius: '12px', padding: '12px'}}>
              <div style={{fontSize: '0.75rem', color: '#78685e', marginBottom: '4px'}}>Límite de crédito</div>
              <div style={{fontSize: '1.1rem', fontWeight: 900}}>${creditLimit.toLocaleString()}</div>
            </div>
            <div style={{flex: 1, background: '#f0ebe4', borderRadius: '12px', padding: '12px'}}>
              <div style={{fontSize: '0.75rem', color: '#78685e', marginBottom: '4px'}}>Disponible</div>
              <div style={{fontSize: '1.1rem', fontWeight: 900}}>${Math.max(0, availableCredit).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {isOverdue && (
        <div className="pwa-alert">
          <div>⚠️</div>
          <div>Este cliente tiene documentos vencidos. El pedido puede capturarse, pero podría requerir autorización antes de surtirse.</div>
        </div>
      )}

      <div className="pwa-card" style={{margin: '0 20px 100px 20px'}}>
        <div className="pwa-card-row">
          <div style={{fontSize: '1.2rem', fontWeight: 900}}>Información comercial</div>
          <span className="pwa-pill success">Activo</span>
        </div>
        <div style={{fontSize: '0.85rem', color: '#78685e', marginBottom: '16px'}}>
          Lista: {priceListName} · Vendedor: {user?.name?.split(' ')[0] || 'Arturo'}
        </div>

        <div style={{display: 'flex', gap: '12px'}}>
          <button className="pwa-btn secondary" style={{padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            <span>📍</span> Ubicación
          </button>
          <button className="pwa-btn secondary" style={{padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            <span>📄</span> Estado de cuenta
          </button>
        </div>
      </div>

      <div className="pwa-fixed-action">
        <button className="pwa-btn" onClick={() => navigate(`/pwa/cliente/${client.id}/catalogo`)}>
          Levantar pedido
        </button>
      </div>
    </div>
  );
}

export default PwaClientDetails;
