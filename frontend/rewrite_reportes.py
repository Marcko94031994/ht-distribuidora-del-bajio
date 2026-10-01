import re

with open('src/components/Reportes.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add focusedCard state
if 'const [focusedCard' not in content:
    content = content.replace('const [dateFilter, setDateFilter] = useState(\'all\'); // all, month, week', 
                              'const [dateFilter, setDateFilter] = useState(\'all\'); // all, month, week\n  const [focusedCard, setFocusedCard] = useState(null);')

# Hide Top hero and KPI
content = re.sub(r'(<div className=\"card glass\" style=\{\{ gridColumn: \'1 / -1\', padding: \'16px 24px\', display: \'flex\',)', r'{!focusedCard && (\n      \1', content)
content = content.replace('      <div className="kpi-row"', '      )}\n\n      {!focusedCard && (\n      <div className="kpi-row"')

# End the KPI row conditional and start the Masonry conditional wrapper
content = content.replace('''          <div className="muted" style={{ fontSize: '0.8rem' }}>Sobre ventas entregadas</div>
        </div>
      </div>''', 
'''          <div className="muted" style={{ fontSize: '0.8rem' }}>Sobre ventas entregadas</div>
        </div>
      </div>
      )}

      {focusedCard && (
        <button className="btn primary" onClick={() => setFocusedCard(null)} style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
          ⬅ Volver al Tablero
        </button>
      )}

      <div style={{ gridColumn: '1 / -1', columnWidth: focusedCard ? '100%' : '450px', columnGap: '20px' }}>''')

# Clean old gridColumns
content = content.replace(' style={{ gridColumn: \'1 / span 2\' }}', '')

# Replace Riesgo de Merma
content = content.replace('''<div className="card glass">
        <div className="card-h">
          <div className="row">
            <h3 style={{ margin: 0 }}>⚠️ Riesgo de Merma (Próximos a Vencer)</h3>''', 
'''{(!focusedCard || focusedCard === 'merma') && (
<div className="card glass" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '20px', display: 'inline-block', width: '100%' }}>
        <div className="card-h" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard(focusedCard ? null : 'merma')}>
          <div className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>⚠️ Riesgo de Merma (Próximos a Vencer)</h3>''')

# Close the row correctly for Merma
content = content.replace('''            <h3 style={{ margin: 0 }}>⚠️ Riesgo de Merma (Próximos a Vencer)</h3>
            <span className="chip warn">Acción Requerida</span>
          </div>
        </div>
        <div className="card-b" style={{ maxHeight: '350px', overflowY: 'auto', padding: 0 }}>''',
'''            <span className="chip warn">Acción Requerida</span>
          </div>
        </div>
        <div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '350px', overflow: 'auto', padding: 0 }}>''')

# Replace Rentabilidad
content = content.replace('''<div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>📈 Análisis de Rentabilidad</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '350px', overflowY: 'auto' }}>''', 
''')}

      {(!focusedCard || focusedCard === 'rentabilidad') && (
      <div className="card glass" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '20px', display: 'inline-block', width: '100%' }}>
        <div className="card-h" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard(focusedCard ? null : 'rentabilidad')}>
          <h3 style={{ margin: 0 }}>📈 Análisis de Rentabilidad</h3>
        </div>
        <div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '350px', overflow: 'auto' }}>''')

# Replace Top Clientes
content = content.replace('''<div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>🏆 Top Clientes</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '350px', overflowY: 'auto' }}>''',
''')}

      {(!focusedCard || focusedCard === 'clientes') && (
      <div className="card glass" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '20px', display: 'inline-block', width: '100%' }}>
        <div className="card-h" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard(focusedCard ? null : 'clientes')}>
          <h3 style={{ margin: 0 }}>🏆 Top Clientes</h3>
        </div>
        <div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '350px', overflow: 'auto' }}>''')

# Replace CxC
content = content.replace('''{/* Reportes de Cartera CxC / CxP */}
      <div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>💰 Cuentas por Cobrar (CxC)</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '400px', overflowY: 'auto', background: '#f8fafc' }}>''',
''')}

      {/* Reportes de Cartera CxC / CxP */}
      {(!focusedCard || focusedCard === 'cxc') && (
      <div className="card glass" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '20px', display: 'inline-block', width: '100%' }}>
        <div className="card-h" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard(focusedCard ? null : 'cxc')}>
          <h3 style={{ margin: 0 }}>💰 Cuentas por Cobrar (CxC)</h3>
        </div>
        <div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '400px', overflow: 'auto', background: '#f8fafc' }}>''')

# Replace CxP
content = content.replace('''<div className="card glass">
        <div className="card-h">
          <h3 style={{ margin: 0 }}>🧾 Cuentas por Pagar (CxP)</h3>
        </div>
        <div className="card-b" style={{ maxHeight: '400px', overflowY: 'auto', background: '#f8fafc' }}>''',
''')}

      {(!focusedCard || focusedCard === 'cxp') && (
      <div className="card glass" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '20px', display: 'inline-block', width: '100%' }}>
        <div className="card-h" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard(focusedCard ? null : 'cxp')}>
          <h3 style={{ margin: 0 }}>🧾 Cuentas por Pagar (CxP)</h3>
        </div>
        <div className="card-b" style={{ maxHeight: focusedCard ? 'calc(100vh - 200px)' : '400px', overflow: 'auto', background: '#f8fafc' }}>''')

# End tags
content = content.replace('''      </div>
      
    </div>
  );
}''', '''      )}
      </div>

    </div>
  );
}''')

with open('src/components/Reportes.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
