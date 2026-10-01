import re

with open('src/components/Reportes.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

rentabilidad_old = '''<div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '350px', overflow: 'auto' }}>
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
        </div>'''

rentabilidad_new = '''<div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '350px', overflow: 'auto', padding: (focusedCard === 'rentabilidad') ? 0 : '20px' }}>
          {focusedCard === 'rentabilidad' ? (
            <table className="table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th>Pedido</th>
                  <th>Venta</th>
                  <th>Costo</th>
                  <th>Utilidad</th>
                  <th>Margen</th>
                </tr>
              </thead>
              <tbody>
                {[...ventasMargen].reverse().map((v, i) => (
                  <tr key={i}>
                    <td><b>{v.orderNumber}</b></td>
                    <td>{pesos(v.totalAmount)}</td>
                    <td style={{ color: 'var(--danger)' }}>{pesos(v.totalAmount - v.margin)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>+{pesos(v.margin)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, v.marginPercentage))}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', width: '40px', textAlign: 'right' }}>{v.marginPercentage.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="list">
              {[...ventasMargen].slice(-15).reverse().map((v, i) => (
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
          )}
        </div>'''

content = content.replace(rentabilidad_old, rentabilidad_new)

with open('src/components/Reportes.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
