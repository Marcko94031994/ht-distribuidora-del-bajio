import React, { useState, useMemo } from 'react';
import { pesosDecimals } from '../utils/helpers';

export default function AntiguedadSaldosProveedores({ data, onSelectProviderForStatement }) {
  // Fecha de corte (por defecto hoy en formato YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [cutoffDate, setCutoffDate] = useState(todayStr);

  // Intervalo de días (10, 15, 30 o personalizado)
  const [intervalType, setIntervalType] = useState('30'); // '10', '15', '30', 'custom'
  const [customDays, setCustomDays] = useState(15);
  const [search, setSearch] = useState('');
  const [onlyWithDebt, setOnlyWithDebt] = useState(true);
  const [expandedProviders, setExpandedProviders] = useState({});

  // Calcular el tamaño real de días por intervalo
  const intervalDays = useMemo(() => {
    if (intervalType === '10') return 10;
    if (intervalType === '15') return 15;
    if (intervalType === '30') return 30;
    return Math.max(1, Number(customDays) || 15);
  }, [intervalType, customDays]);

  // Definir etiquetas de los rangos
  const bracketsConfig = useMemo(() => {
    if (intervalType === '30') {
      return [
        { id: 'b0', label: 'A vencer', pillColor: '#f1f5f9', textColor: '#334155', isOverdue: false },
        { id: 'b1', label: '1 a 29', pillColor: '#fef3c7', textColor: '#92400e', isOverdue: true, min: 1, max: 29 },
        { id: 'b2', label: '30 a 60', pillColor: '#ffedd5', textColor: '#9a3412', isOverdue: true, min: 30, max: 60 },
        { id: 'b3', label: '61 a 90', pillColor: '#fee2e2', textColor: '#991b1b', isOverdue: true, min: 61, max: 90 },
        { id: 'b4', label: 'Más de 90', pillColor: '#ffe4e6', textColor: '#881337', isOverdue: true, min: 91, max: Infinity }
      ];
    }

    const n = intervalDays;
    return [
      { id: 'b0', label: 'A vencer', pillColor: '#f1f5f9', textColor: '#334155', isOverdue: false },
      { id: 'b1', label: `1 a ${n}`, pillColor: '#fef3c7', textColor: '#92400e', isOverdue: true, min: 1, max: n },
      { id: 'b2', label: `${n + 1} a ${2 * n}`, pillColor: '#ffedd5', textColor: '#9a3412', isOverdue: true, min: n + 1, max: 2 * n },
      { id: 'b3', label: `${2 * n + 1} a ${3 * n}`, pillColor: '#fee2e2', textColor: '#991b1b', isOverdue: true, min: 2 * n + 1, max: 3 * n },
      { id: 'b4', label: `Más de ${3 * n}`, pillColor: '#ffe4e6', textColor: '#881337', isOverdue: true, min: 3 * n + 1, max: Infinity }
    ];
  }, [intervalType, intervalDays]);

  // Formato bonito de fecha de corte para el header (ej: "05 jul 2026")
  const formattedCutoffDisplay = useMemo(() => {
    if (!cutoffDate) return '';
    try {
      const [y, m, d] = cutoffDate.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateObj);
    } catch {
      return cutoffDate;
    }
  }, [cutoffDate]);

  // Proveedores y Órdenes
  const providers = useMemo(() => data.proveedores || [], [data.proveedores]);
  const purchaseOrders = useMemo(() => data.ordenesCompra || [], [data.ordenesCompra]);

  // Procesamiento del Reporte de Antigüedad de Saldos
  const agingReport = useMemo(() => {
    const cutoff = new Date(cutoffDate + 'T23:59:59');

    return providers.map(p => {
      // Filtrar órdenes de este proveedor activas a la fecha de corte
      const providerPOs = purchaseOrders.filter(po => {
        if (po.providerId !== p.id) return false;
        if (po.status === 'Cancelada') return false;
        if (po.date && new Date(po.date) > cutoff) return false; // Emitida después de la fecha de corte
        return true;
      });

      let totalOriginal = 0;
      let totalSaldoAlCorte = 0;
      let aVencer = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let maxDaysOverdue = 0;

      const docs = providerPOs.map(po => {
        const total = Number(po.totalAmount) || 0;
        const paid = Number(po.amountPaid) || 0;
        const balance = Math.max(0, total - paid);

        // Si la orden ya está liquidada al corte, no suma al saldo
        if (balance <= 0) return null;

        totalOriginal += total;
        totalSaldoAlCorte += balance;

        // Determinar fecha de vencimiento
        let due = po.dueDate ? new Date(po.dueDate) : null;
        if (!due && po.date) {
          due = new Date(new Date(po.date).getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        if (!due) due = new Date(po.date || cutoff);

        // Calcular días de atraso respecto a la fecha de corte
        const diffTime = cutoff.getTime() - due.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysOverdue = diffDays > 0 ? diffDays : 0;

        if (daysOverdue > maxDaysOverdue) {
          maxDaysOverdue = daysOverdue;
        }

        let docBracket = 'b0';
        if (daysOverdue <= 0) {
          aVencer += balance;
          docBracket = 'b0';
        } else if (daysOverdue >= bracketsConfig[1].min && daysOverdue <= bracketsConfig[1].max) {
          b1 += balance;
          docBracket = 'b1';
        } else if (daysOverdue >= bracketsConfig[2].min && daysOverdue <= bracketsConfig[2].max) {
          b2 += balance;
          docBracket = 'b2';
        } else if (daysOverdue >= bracketsConfig[3].min && daysOverdue <= bracketsConfig[3].max) {
          b3 += balance;
          docBracket = 'b3';
        } else {
          b4 += balance;
          docBracket = 'b4';
        }

        return {
          id: po.id,
          poNumber: po.poNumber,
          reference1: po.reference1,
          reference2: po.reference2,
          date: po.date,
          dueDate: po.dueDate || due.toISOString(),
          total,
          paid,
          balance,
          daysOverdue,
          docBracket
        };
      }).filter(Boolean);

      // Si el proveedor tiene saldo en BD pero no tiene órdenes detalladas, reflejarlo
      if (docs.length === 0 && (p.currentBalance || 0) > 0) {
        totalOriginal = p.currentBalance;
        totalSaldoAlCorte = p.currentBalance;
        b1 = p.currentBalance; // Asignar al primer rango de cartera
        maxDaysOverdue = 1;
      }

      const totalVencido = b1 + b2 + b3 + b4;

      return {
        providerId: p.id,
        name: p.name,
        rfc: p.rfc || p.contact || 'S/RFC',
        phone: p.phone,
        contact: p.contact,
        docsCount: docs.length,
        documents: docs,
        totalOriginal: totalOriginal > 0 ? totalOriginal : (p.currentBalance || 0),
        saldoAlCorte: totalSaldoAlCorte > 0 ? totalSaldoAlCorte : (p.currentBalance || 0),
        aVencer,
        b1,
        b2,
        b3,
        b4,
        totalVencido,
        maxDaysOverdue
      };
    });
  }, [providers, purchaseOrders, cutoffDate, bracketsConfig]);

  // Filtros de búsqueda y saldo
  const filteredReport = useMemo(() => {
    return agingReport.filter(row => {
      if (onlyWithDebt && row.saldoAlCorte <= 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.rfc.toLowerCase().includes(q) ||
        (row.phone && row.phone.toLowerCase().includes(q))
      );
    }).sort((a, b) => b.saldoAlCorte - a.saldoAlCorte);
  }, [agingReport, onlyWithDebt, search]);

  // Totales Globales para los KPI Cards y el Pie de Tabla
  const totals = useMemo(() => {
    return filteredReport.reduce((acc, row) => ({
      original: acc.original + row.totalOriginal,
      saldoCorte: acc.saldoCorte + row.saldoAlCorte,
      aVencer: acc.aVencer + row.aVencer,
      b1: acc.b1 + row.b1,
      b2: acc.b2 + row.b2,
      b3: acc.b3 + row.b3,
      b4: acc.b4 + row.b4,
      totalVencido: acc.totalVencido + row.totalVencido
    }), {
      original: 0,
      saldoCorte: 0,
      aVencer: 0,
      b1: 0,
      b2: 0,
      b3: 0,
      b4: 0,
      totalVencido: 0
    });
  }, [filteredReport]);

  const toggleExpand = (id) => {
    setExpandedProviders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = [
      'Proveedor',
      'RFC / Contacto',
      'Documentos',
      'Importe Original',
      'Saldo al Corte',
      'A Vencer',
      bracketsConfig[1].label,
      bracketsConfig[2].label,
      bracketsConfig[3].label,
      bracketsConfig[4].label,
      'Vencido Total',
      'Dias Vencido Max'
    ];

    const rows = filteredReport.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.rfc}"`,
      r.docsCount,
      r.totalOriginal.toFixed(2),
      r.saldoAlCorte.toFixed(2),
      r.aVencer.toFixed(2),
      r.b1.toFixed(2),
      r.b2.toFixed(2),
      r.b3.toFixed(2),
      r.b4.toFixed(2),
      r.totalVencido.toFixed(2),
      r.maxDaysOverdue
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Antiguedad_Saldos_Proveedores_${cutoffDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header Bar: FECHA DE CORTE & PILLS DE RANGOS */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          padding: '16px 24px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Left: Cutoff Date Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              FECHA DE CORTE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                {formattedCutoffDisplay}
              </span>
              <input 
                type="date"
                className="input small"
                value={cutoffDate}
                onChange={e => setCutoffDate(e.target.value)}
                style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {/* Selector de Rango de Antigüedad (1 a 10, 1 a 15, 1 a 29/30) */}
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
              Intervalo de Rangos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                className={`btn small ${intervalType === '10' ? 'primary' : 'secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => setIntervalType('10')}
              >
                1 a 10 días
              </button>
              <button 
                className={`btn small ${intervalType === '15' ? 'primary' : 'secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => setIntervalType('15')}
              >
                1 a 15 días
              </button>
              <button 
                className={`btn small ${intervalType === '30' ? 'primary' : 'secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => setIntervalType('30')}
              >
                1 a 30 días
              </button>
              <button 
                className={`btn small ${intervalType === 'custom' ? 'primary' : 'secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => setIntervalType('custom')}
              >
                Personalizado
              </button>
              {intervalType === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <input 
                    type="number"
                    min="1"
                    max="180"
                    value={customDays}
                    onChange={e => setCustomDays(e.target.value)}
                    style={{ width: '55px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>días</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Badges / Pills de los Rangos Activos */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {bracketsConfig.map(b => (
            <span 
              key={b.id}
              style={{
                background: b.pillColor,
                color: b.textColor,
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid rgba(0,0,0,0.06)'
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Tarjetas KPI / Resumen de Pasivos (Diseño fiel a la imagen) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '12px' 
        }}
      >
        {/* Card 1: SALDO TOTAL */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SALDO TOTAL
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>
            {pesosDecimals(totals.saldoCorte)}
          </div>
        </div>

        {/* Card 2: A VENCER */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            A VENCER
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {pesosDecimals(totals.aVencer)}
          </div>
        </div>

        {/* Card 3: VENCIDO TOTAL */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            VENCIDO TOTAL
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
            {pesosDecimals(totals.totalVencido)}
          </div>
        </div>

        {/* Card 4: RANGO 1 */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[1].label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            {pesosDecimals(totals.b1)}
          </div>
        </div>

        {/* Card 5: RANGO 2 */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[2].label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#c2410c', marginTop: '6px' }}>
            {pesosDecimals(totals.b2)}
          </div>
        </div>

        {/* Card 6: RANGO 3 */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[3].label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
            {pesosDecimals(totals.b3)}
          </div>
        </div>

        {/* Card 7: RANGO 4 */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[4].label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#991b1b', marginTop: '6px' }}>
            {pesosDecimals(totals.b4)}
          </div>
        </div>
      </div>

      {/* 3. Tabla Matriz: PROVEEDORES - Saldos por Rango de Antigüedad */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Subheader con búsqueda y botones de exportación */}
        <div 
          style={{ 
            padding: '18px 24px', 
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              PROVEEDORES
            </div>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Saldos por rango de antigüedad
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search */}
            <input 
              type="text"
              className="input small"
              placeholder="🔍 Buscar proveedor o RFC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '240px', fontSize: '13px' }}
            />

            {/* Checkbox solo con deuda */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={onlyWithDebt}
                onChange={e => setOnlyWithDebt(e.target.checked)}
              />
              Solo con saldo pendiente
            </label>

            {/* Export CSV */}
            <button 
              className="btn secondary small" 
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              📥 Exportar CSV
            </button>
          </div>
        </div>

        {/* Matriz Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table full" style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '220px' }}>PROVEEDOR</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '120px' }}>IMPORTE ORIGINAL</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '120px' }}>SALDO AL CORTE</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '100px' }}>A VENCER</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '100px' }}>{bracketsConfig[1].label}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '100px' }}>{bracketsConfig[2].label}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '100px' }}>{bracketsConfig[3].label}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '100px' }}>{bracketsConfig[4].label}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '120px', color: '#dc2626' }}>VENCIDO TOTAL</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '130px' }}>DÍAS VENCIDO MÁXIMO</th>
              </tr>
            </thead>
            <tbody>
              {filteredReport.map(row => {
                const isExpanded = !!expandedProviders[row.providerId];
                return (
                  <React.Fragment key={row.providerId}>
                    <tr 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                        background: isExpanded ? '#f8fafc' : 'transparent'
                      }}
                    >
                      {/* PROVEEDOR with (+) button */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <button 
                            onClick={() => toggleExpand(row.providerId)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontWeight: 800,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              marginTop: '2px',
                              flexShrink: 0
                            }}
                            title={isExpanded ? 'Ocultar documentos' : 'Ver detalle de órdenes y facturas'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                          <div>
                            <div 
                              style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px', cursor: 'pointer' }}
                              onClick={() => onSelectProviderForStatement && onSelectProviderForStatement(row)}
                            >
                              {row.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {row.rfc} · {row.docsCount} {row.docsCount === 1 ? 'documento' : 'documentos'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IMPORTE ORIGINAL */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        {pesosDecimals(row.totalOriginal)}
                      </td>

                      {/* SALDO AL CORTE */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {pesosDecimals(row.saldoAlCorte)}
                      </td>

                      {/* A VENCER */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: row.aVencer > 0 ? '#0f172a' : '#94a3b8' }}>
                        {pesosDecimals(row.aVencer)}
                      </td>

                      {/* RANGO 1 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: row.b1 > 0 ? '#b45309' : '#94a3b8', fontWeight: row.b1 > 0 ? 600 : 400 }}>
                        {pesosDecimals(row.b1)}
                      </td>

                      {/* RANGO 2 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: row.b2 > 0 ? '#c2410c' : '#94a3b8', fontWeight: row.b2 > 0 ? 600 : 400 }}>
                        {pesosDecimals(row.b2)}
                      </td>

                      {/* RANGO 3 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: row.b3 > 0 ? '#dc2626' : '#94a3b8', fontWeight: row.b3 > 0 ? 600 : 400 }}>
                        {pesosDecimals(row.b3)}
                      </td>

                      {/* RANGO 4 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: row.b4 > 0 ? '#991b1b' : '#94a3b8', fontWeight: row.b4 > 0 ? 600 : 400 }}>
                        {pesosDecimals(row.b4)}
                      </td>

                      {/* VENCIDO TOTAL */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: row.totalVencido > 0 ? '#dc2626' : '#94a3b8' }}>
                        {pesosDecimals(row.totalVencido)}
                      </td>

                      {/* DÍAS VENCIDO MÁXIMO */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: row.maxDaysOverdue > 0 ? '#0f172a' : '#94a3b8' }}>
                        {row.maxDaysOverdue > 0 ? row.maxDaysOverdue : '0'}
                      </td>
                    </tr>

                    {/* Desglose Expandible (+) de Documentos del Proveedor */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={10} style={{ padding: '12px 24px 20px 48px', borderBottom: '2px solid #e2e8f0' }}>
                          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                📄 Detalle de Órdenes de Compra y Facturas de {row.name}:
                              </span>
                              {onSelectProviderForStatement && (
                                <button 
                                  className="btn secondary small"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={() => onSelectProviderForStatement(row)}
                                >
                                  Ir a Estado de Cuenta y Abonar ➜
                                </button>
                              )}
                            </div>

                            {row.documents && row.documents.length > 0 ? (
                              <table className="table full" style={{ fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Documento / OC</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Factura / Ref</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Fecha Emisión</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Vencimiento</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Días Atraso</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Facturado</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Abonado</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Saldo Pendiente</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Rango</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.documents.map(doc => (
                                    <tr key={doc.id || doc.poNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1e293b' }}>
                                        {doc.poNumber}
                                      </td>
                                      <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                        {doc.reference1 || 'S/F'}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>
                                        {doc.date ? doc.date.split('T')[0] : 'N/D'}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>
                                        {doc.dueDate ? doc.dueDate.split('T')[0] : 'N/D'}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: doc.daysOverdue > 0 ? '#dc2626' : '#059669' }}>
                                        {doc.daysOverdue > 0 ? `${doc.daysOverdue} d` : 'Al corriente'}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                                        {pesosDecimals(doc.total)}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#059669' }}>
                                        {pesosDecimals(doc.paid)}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#d81921' }}>
                                        {pesosDecimals(doc.balance)}
                                      </td>
                                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <span 
                                          style={{
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            background: bracketsConfig.find(b => b.id === doc.docBracket)?.pillColor || '#f1f5f9',
                                            color: bracketsConfig.find(b => b.id === doc.docBracket)?.textColor || '#334155'
                                          }}
                                        >
                                          {bracketsConfig.find(b => b.id === doc.docBracket)?.label}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                                Saldo en cuenta registrado directamente en catálogo.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredReport.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                    No se encontraron registros de proveedores para la fecha y filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Fila de Totales Generales */}
            {filteredReport.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                  <td style={{ padding: '14px 16px', color: '#0f172a' }}>
                    TOTALES GENERALES ({filteredReport.length} proveedores)
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#334155' }}>
                    {pesosDecimals(totals.original)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#1d4ed8', fontSize: '14px' }}>
                    {pesosDecimals(totals.saldoCorte)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#0f172a' }}>
                    {pesosDecimals(totals.aVencer)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#b45309' }}>
                    {pesosDecimals(totals.b1)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#c2410c' }}>
                    {pesosDecimals(totals.b2)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#dc2626' }}>
                    {pesosDecimals(totals.b3)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#991b1b' }}>
                    {pesosDecimals(totals.b4)}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'right', color: '#dc2626', fontSize: '14px' }}>
                    {pesosDecimals(totals.totalVencido)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#64748b' }}>
                    —
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}
