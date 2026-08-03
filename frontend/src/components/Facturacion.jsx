import React, { useState, useMemo } from 'react';
import { pesos } from '../utils/helpers';

export default function Facturacion({ data, reloadState }) {
  const [filter, setFilter] = useState('pendientes'); // pendientes | facturadas

  const orders = useMemo(() => {
    const list = data.pedidos || [];
    if (filter === 'pendientes') {
      return list.filter(o => !o.isFacturado && (o.status === 'Entregado' || o.status === 'Entregado con Devolución'));
    }
    return list.filter(o => o.isFacturado);
  }, [data.pedidos, filter]);

  const timbrarFactura = async (orderId) => {
    if (!confirm('¿Deseas generar el CFDI 4.0 para este pedido?')) return;
    
    const token = localStorage.getItem('ht_token');
    try {
      // Simulación de timbrado (En producción aquí se llama al PAC)
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/order/${orderId}/stamp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('✅ CFDI 4.0 Generado exitosamente. Se ha enviado al correo del cliente.');
        reloadState();
      } else {
        const err = await res.text();
        alert('❌ Error SAT: ' + err);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="view-container animate-fade-in">
      <div className="glass" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>📄 Centro de Facturación CFDI 4.0</h2>
          <p className="muted">Emisión de facturas electrónicas y cumplimiento fiscal.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`btn ${filter === 'pendientes' ? 'primary' : 'secondary'}`} onClick={() => setFilter('pendientes')}>Por Facturar</button>
          <button className={`btn ${filter === 'facturadas' ? 'primary' : 'secondary'}`} onClick={() => setFilter('facturadas')}>Historial CFDI</button>
        </div>
      </div>

      <div className="glass" style={{ padding: '20px', borderRadius: '24px' }}>
        <table className="table full">
          <thead>
            <tr>
              <th>Folio Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Monto Total</th>
              <th>RFC Receptor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const allClients = data.clientes && data.clientes.length > 0 
                ? data.clientes 
                : (data.rutas || []).flatMap(r => r.clients || []);
              const client = allClients.find(c => c.id === o.clientId);
              return (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>{o.orderNumber}</td>
                  <td>{client?.name}</td>
                  <td>{o.time}</td>
                  <td style={{ fontWeight: 800 }}>{pesos(o.totalAmount)}</td>
                  <td className="muted">{client?.rfc || 'SIN RFC'}</td>
                  <td>
                    {o.isFacturado ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn success small">PDF</button>
                        <button className="btn secondary small">XML</button>
                      </div>
                    ) : (
                      <button 
                        className="btn primary small" 
                        disabled={!client?.rfc}
                        onClick={() => timbrarFactura(o.id)}
                        title={!client?.rfc ? 'Faltan datos fiscales del cliente' : ''}
                      >
                        {client?.rfc ? '🚀 Timbrar' : '⚠️ Sin RFC'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
