import React, { useMemo } from 'react';
import { pesos } from '../utils/helpers';

export default function Reportes({ data, reports, producto, cliente }) {
  
  const stats = useMemo(() => {
    const productSales = {};
    const clientSales = {};
    
    (data.pedidos || []).filter(p => p.status === 'Entregado' || p.status === 'Entregado con Devolución').forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          const p = producto(item.productId);
          productSales[item.productId] = { name: p?.name || '?', qty: 0 };
        }
        productSales[item.productId].qty += item.quantity;
      });

      if (!clientSales[order.clientId]) {
        const c = cliente(order.clientId);
        clientSales[order.clientId] = { name: c?.name || '?', total: 0 };
      }
      clientSales[order.clientId].total += order.totalAmount;
    });

    return {
      topProducts: Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5),
      topClients: Object.values(clientSales).sort((a, b) => b.total - a.total).slice(0, 5)
    };
  }, [data, producto, cliente]);

  const totalInventoryValue = reports.valorInventario?.reduce((sum, p) => sum + p.totalValue, 0) || 0;

  return (
    <div className="grid">
      <div className="kpi-row" style={{ gridColumn: '1 / -1' }}>
        <div className="kpi-card glass">
          <div className="kpi-label">Utilidad Real Bruta</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{pesos(reports.totalUtilidad)}</div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Basado en costo vs venta</div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-label">Valor del Inventario</div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>{pesos(totalInventoryValue)}</div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Costo total en almacén</div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-label">Productos en Riesgo</div>
          <div className="kpi-value" style={{ color: reports.riesgoMerma?.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {reports.riesgoMerma?.length || 0}
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Vencimiento &lt; 3 meses</div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-label">Margen Promedio</div>
          <div className="kpi-value">
             {reports.ventasMargen?.length > 0 
               ? (reports.ventasMargen.reduce((sum, v) => sum + v.marginPercentage, 0) / reports.ventasMargen.length).toFixed(1)
               : 0}%
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Sobre ventas entregadas</div>
        </div>
      </div>

      <div className="card glass" style={{ gridColumn: '1 / span 2' }}>
        <div className="card-h">
          <div className="row">
            <h3>⚠️ Riesgo de Merma (Próximos a Vencer)</h3>
            <span className="chip warn">Acción Requerida</span>
          </div>
        </div>
        <div className="card-b">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Caducidad</th>
                <th>Existencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(reports.riesgoMerma || []).map((b, i) => {
                const diff = (new Date(b.expirationDate) - new Date()) / (1000 * 60 * 60 * 24);
                return (
                  <tr key={i}>
                    <td><b>{b.product?.name}</b></td>
                    <td><code style={{ background: '#eee', padding: '2px 4px', borderRadius: '4px' }}>{b.batchNumber}</code></td>
                    <td>{new Date(b.expirationDate).toLocaleDateString()}</td>
                    <td>{b.quantity} pzas</td>
                    <td>
                      <span className={`chip ${diff < 30 ? 'err' : 'warn'}`}>
                        {diff < 30 ? 'Crítico' : 'Próximo'} ({Math.round(diff)} días)
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!reports.riesgoMerma || reports.riesgoMerma.length === 0) && (
                <tr><td colSpan="5" className="muted text-center">No hay productos próximos a vencer. 🙌</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card glass">
        <div className="card-h">
          <h3>📈 Análisis de Rentabilidad por Pedido</h3>
        </div>
        <div className="card-b">
          <div className="list">
            {(reports.ventasMargen || []).slice(-5).reverse().map((v, i) => (
              <div className="item" key={i}>
                <div className="row">
                  <b>{v.orderNumber}</b>
                  <span style={{ color: 'var(--success)' }}>+{pesos(v.margin)}</span>
                </div>
                <div className="row muted" style={{ fontSize: '0.85rem' }}>
                  <span>Venta: {pesos(v.totalAmount)}</span>
                  <span>Margen: {v.marginPercentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
            {(!reports.ventasMargen || reports.ventasMargen.length === 0) && (
              <div className="item muted">Esperando primeras entregas...</div>
            )}
          </div>
        </div>
      </div>

      <div className="card glass">
        <div className="card-h">
          <h3>🏆 Top 5 Clientes</h3>
        </div>
        <div className="card-b">
          <div className="list">
            {stats.topClients.map((c, i) => (
              <div className="item" key={i}>
                <div className="row">
                  <b>{c.name}</b>
                  <span>{pesos(c.total)}</span>
                </div>
                <div className="progress-bar" style={{ height: '4px', background: '#eee', borderRadius: '2px', marginTop: '8px' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--success)', 
                    width: stats.topClients[0].total > 0 ? `${(c.total / stats.topClients[0].total) * 100}%` : '0%',
                    borderRadius: '2px'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reportes de Cartera CxC / CxP */}
      <div className="card glass" style={{ gridColumn: '1 / span 2' }}>
        <div className="card-h">
          <h3>💰 Cuentas por Cobrar (CxC)</h3>
        </div>
        <div className="card-b list">
          {(data.cxc || []).map((c, i) => (
            <div className="item" key={i}>
              <div className="row">
                <b>{c.name}</b>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{pesos(c.currentBalance)}</span>
              </div>
              <div className="row muted" style={{ fontSize: '0.85rem' }}>
                <span>Zona: {c.zone}</span>
                <span>{c.unpaidOrders?.length || 0} Notas Pendientes</span>
              </div>
              {c.unpaidOrders?.length > 0 && (
                <div style={{ marginTop: '5px', paddingLeft: '10px', borderLeft: '2px solid #ccc' }}>
                  {c.unpaidOrders.map(o => (
                    <div key={o.id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: o.isOverdue ? 'var(--danger)' : 'inherit', fontWeight: o.isOverdue ? 'bold' : 'normal' }}>
                      <span>Nota {o.orderNumber} {o.isOverdue && '(VENCIDA)'}</span>
                      <span>Deuda: {pesos(o.totalAmount - o.amountPaid)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!data.cxc || data.cxc.length === 0) && <div className="item muted">No hay cuentas por cobrar. 🎉</div>}
        </div>
      </div>

      <div className="card glass">
        <div className="card-h">
          <h3>🧾 Cuentas por Pagar (CxP)</h3>
        </div>
        <div className="card-b list">
          {(data.cxp || []).map((p, i) => (
            <div className="item" key={i}>
              <div className="row">
                <b>{p.name}</b>
                <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{pesos(p.currentBalance)}</span>
              </div>
              <div className="row muted" style={{ fontSize: '0.85rem' }}>
                <span>{p.unpaidPOs?.length || 0} OC Pendientes</span>
              </div>
              {p.unpaidPOs?.length > 0 && (
                <div style={{ marginTop: '5px', paddingLeft: '10px', borderLeft: '2px solid #ccc' }}>
                  {p.unpaidPOs.map(po => (
                    <div key={po.id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: po.isOverdue ? 'var(--danger)' : 'inherit' }}>
                      <span>OC {po.poNumber}</span>
                      <span>Deuda: {pesos(po.totalAmount - po.amountPaid)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!data.cxp || data.cxp.length === 0) && <div className="item muted">No hay cuentas por pagar. 🎉</div>}
        </div>
      </div>
    </div>
  );
}
