import React, { useMemo, useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Reportes({ data, reports, producto, cliente }) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, month, week

  // Filtrado de Pedidos por fecha
  const filteredPedidos = useMemo(() => {
    return (data.pedidos || []).filter(p => {
      if (dateFilter === 'all') return true;
      const d = new Date(p.createdAt || p.date || new Date());
      const now = new Date();
      if (dateFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      return true;
    });
  }, [data.pedidos, dateFilter]);

  const stats = useMemo(() => {
    const productSales = {};
    const clientSales = {};
    
    filteredPedidos.filter(p => p.status === 'Entregado' || p.status === 'Entregado con Devolución').forEach(order => {
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

    let topClients = Object.values(clientSales).sort((a, b) => b.total - a.total);
    if(search) {
      topClients = topClients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }

    return {
      topProducts: Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5),
      topClients: topClients.slice(0, 5)
    };
  }, [filteredPedidos, producto, cliente, search]);

  const totalInventoryValue = reports.valorInventario?.reduce((sum, p) => sum + p.totalValue, 0) || 0;

  // Filtrar Riesgos de Merma
  const riesgoMerma = useMemo(() => {
    let arr = reports.riesgoMerma || [];
    if(search) {
      arr = arr.filter(b => b.product?.name?.toLowerCase().includes(search.toLowerCase()) || b.batchNumber?.toLowerCase().includes(search.toLowerCase()));
    }
    return arr;
  }, [reports.riesgoMerma, search]);

  // Filtrar Rentabilidad
  const ventasMargen = useMemo(() => {
    let arr = reports.ventasMargen || [];
    if(search) {
      arr = arr.filter(v => v.orderNumber?.toLowerCase().includes(search.toLowerCase()));
    }
    // Asumimos que ventasMargen también podría filtrarse por fecha si tuviera campo fecha, pero lo limitaremos al buscador
    return arr;
  }, [reports.ventasMargen, search]);

  // Filtrar CxC y CxP
  const cxc = useMemo(() => {
    let arr = data.cxc || [];
    if(search) {
      arr = arr.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.zone?.toLowerCase().includes(search.toLowerCase()));
    }
    return arr;
  }, [data.cxc, search]);

  const cxp = useMemo(() => {
    let arr = data.cxp || [];
    if(search) {
      arr = arr.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
    }
    return arr;
  }, [data.cxp, search]);


  return (
    <div className="grid">
      
      {/* Barra de Filtros */}
      <div className="card glass" style={{ gridColumn: '1 / -1', padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊</span> Tablero de Inteligencia
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }}>🔍</span>
            <input 
              type="text" 
              className="input" 
              placeholder="Buscar cliente, producto, documento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', borderRadius: '99px' }}
            />
          </div>
          
          <select 
            className="select" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: 'auto', borderRadius: '99px', background: '#fff' }}
          >
            <option value="all">Histórico (Todo)</option>
            <option value="month">Este Mes</option>
            <option value="week">Últimos 7 Días</option>
          </select>
        </div>
      </div>

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
          <div className="kpi-value" style={{ color: riesgoMerma.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {riesgoMerma.length}
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Vencimiento &lt; 3 meses</div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-label">Margen Promedio</div>
          <div className="kpi-value">
             {ventasMargen.length > 0 
               ? (ventasMargen.reduce((sum, v) => sum + v.marginPercentage, 0) / ventasMargen.length).toFixed(1)
               : 0}%
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Sobre ventas entregadas</div>
        </div>
      </div>

      <div className="card glass" style={{ gridColumn: '1 / span 2' }}>
        <div className="card-h">
          <div className="row">
            <h3 style={{ margin: 0 }}>⚠️ Riesgo de Merma (Próximos a Vencer)</h3>
            <span className="chip warn">Acción Requerida</span>
          </div>
        </div>
        <div className="card-b" style={{ maxHeight: '350px', overflowY: 'auto', padding: 0 }}>
          <table className="table" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Caducidad</th>
                <th>Existencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {riesgoMerma.map((b, i) => {
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
              {riesgoMerma.length === 0 && (
                <tr><td colSpan="5" className="muted text-center" style={{ padding: '24px' }}>No hay productos que coincidan con la búsqueda. 🙌</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>📈 Análisis de Rentabilidad</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <div className="list">
            {ventasMargen.slice(-15).reverse().map((v, i) => (
              <div className="item" key={i} style={{ padding: '12px' }}>
                <div className="row">
                  <b>{v.orderNumber}</b>
                  <span style={{ color: 'var(--success)', fontWeight: '900' }}>+{pesos(v.margin)}</span>
                </div>
                <div className="row muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  <span>Venta: {pesos(v.totalAmount)}</span>
                  <span>Margen: {v.marginPercentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
            {ventasMargen.length === 0 && (
              <div className="item muted text-center">Esperando primeras entregas...</div>
            )}
          </div>
        </div>
      </div>

      <div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>🏆 Top Clientes</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <div className="list">
            {stats.topClients.map((c, i) => (
              <div className="item" key={i} style={{ padding: '12px' }}>
                <div className="row">
                  <b>{c.name}</b>
                  <span>{pesos(c.total)}</span>
                </div>
                <div className="progress-bar" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '8px' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--success)', 
                    width: stats.topClients[0].total > 0 ? `${(c.total / stats.topClients[0].total) * 100}%` : '0%',
                    borderRadius: '3px'
                  }}></div>
                </div>
              </div>
            ))}
            {stats.topClients.length === 0 && <div className="item muted text-center">Sin datos de clientes</div>}
          </div>
        </div>
      </div>

      {/* Reportes de Cartera CxC / CxP */}
      <div className="card glass" style={{ gridColumn: '1 / span 2' }}>
        <div className="card-h">
          <h3 style={{ margin: 0 }}>💰 Cuentas por Cobrar (CxC)</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '400px', overflowY: 'auto', background: '#f8fafc' }}>
          <div className="list">
            {cxc.map((c, i) => (
              <div className="item" key={i} style={{ borderColor: 'rgba(220,38,38,0.2)' }}>
                <div className="row">
                  <b>{c.name}</b>
                  <span style={{ color: 'var(--danger)', fontWeight: '900', fontSize: '1.1rem' }}>{pesos(c.currentBalance)}</span>
                </div>
                <div className="row muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  <span>Zona: {c.zone}</span>
                  <span>{c.unpaidOrders?.length || 0} Notas Pendientes</span>
                </div>
                {c.unpaidOrders?.length > 0 && (
                  <div style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '3px solid #fecaca', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {c.unpaidOrders.map(o => (
                      <div key={o.id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: o.isOverdue ? 'var(--danger)' : '#475569', fontWeight: o.isOverdue ? 'bold' : 'normal' }}>
                        <span>📝 Nota {o.orderNumber} {o.isOverdue && <span className="chip err" style={{zoom: 0.7, marginLeft: '4px'}}>VENCIDA</span>}</span>
                        <span>{pesos(o.totalAmount - o.amountPaid)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cxc.length === 0 && <div className="item muted text-center">No hay cuentas por cobrar. 🎉</div>}
          </div>
        </div>
      </div>

      <div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>🧾 Cuentas por Pagar (CxP)</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '400px', overflowY: 'auto', background: '#f8fafc' }}>
          <div className="list">
            {cxp.map((p, i) => (
              <div className="item" key={i} style={{ borderColor: 'rgba(217,119,6,0.2)' }}>
                <div className="row">
                  <b>{p.name}</b>
                  <span style={{ color: 'var(--warning)', fontWeight: '900', fontSize: '1.1rem' }}>{pesos(p.currentBalance)}</span>
                </div>
                <div className="row muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  <span>{p.unpaidPOs?.length || 0} OC Pendientes</span>
                </div>
                {p.unpaidPOs?.length > 0 && (
                  <div style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '3px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {p.unpaidPOs.map(po => (
                      <div key={po.id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: po.isOverdue ? 'var(--danger)' : '#475569' }}>
                        <span>🛒 OC {po.poNumber}</span>
                        <span>{pesos(po.totalAmount - po.amountPaid)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cxp.length === 0 && <div className="item muted text-center">No hay cuentas por pagar. 🎉</div>}
          </div>
        </div>
      </div>
      
    </div>
  );
}
