import React, { useState, useMemo, useEffect } from 'react';
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
  const [serverAgingData, setServerAgingData] = useState(null);
  const [loadingServer, setLoadingServer] = useState(false);

  // Calcular el tamaño real de días por intervalo
  const intervalDays = useMemo(() => {
    if (intervalType === '10') return 10;
    if (intervalType === '15') return 15;
    if (intervalType === '30') return 30;
    return Math.max(1, Number(customDays) || 15);
  }, [intervalType, customDays]);

  // Definir etiquetas y configuración de los rangos
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

  // Formato localizado de fecha de corte para el header (ej: "05 ago 2026")
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

  // Proveedores, Órdenes y Pagos desde el contexto
  const providers = useMemo(() => data.proveedores || [], [data.proveedores]);
  const purchaseOrders = useMemo(() => data.ordenesCompra || data.compras || [], [data.ordenesCompra, data.compras]);
  const providerPayments = useMemo(() => data.pagosProveedores || [], [data.pagosProveedores]);

  // Intentar cargar cálculo exacto del servidor cuando cambia la fecha de corte
  useEffect(() => {
    let isMounted = true;
    const fetchServerAging = async () => {
      try {
        setLoadingServer(true);
        const token = localStorage.getItem('ht_token');
        const res = await fetch(
          (import.meta.env.VITE_API_URL || '') + `/api/app/finance/cxp/aging?cutoffDate=${cutoffDate}&intervalDays=${intervalDays}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          setServerAgingData(json);
        }
      } catch (err) {
        console.warn('Fallback a cálculo de antigüedad local:', err);
      } finally {
        if (isMounted) setLoadingServer(false);
      }
    };

    fetchServerAging();
    return () => { isMounted = false; };
  }, [cutoffDate, intervalDays]);

  // Procesamiento del Reporte de Antigüedad de Saldos considerando la Fecha de Corte de forma histórica
  const agingReport = useMemo(() => {
    // Si tenemos respuesta del servidor para esta fecha de corte, mapearla
    if (serverAgingData && serverAgingData.providers) {
      return serverAgingData.providers.map(p => ({
        providerId: p.id,
        name: p.name,
        rfc: p.rfc || p.contact || 'S/RFC',
        phone: p.phone,
        contact: p.contact,
        docsCount: p.documents?.length || 0,
        documents: (p.documents || []).map(doc => {
          const total = Number(doc.total ?? doc.Total ?? 0);
          const paid = Number(doc.paid ?? doc.paidAtCutoff ?? doc.PaidAtCutoff ?? 0);
          const balance = Number(doc.balance ?? doc.balanceAtCutoff ?? doc.BalanceAtCutoff ?? Math.max(0, total - paid));
          const daysOverdue = Number(doc.daysOverdue ?? doc.DaysOverdue ?? 0);
          let docBracket = 'b0';
          if (daysOverdue <= 0) {
            docBracket = 'b0';
          } else if (daysOverdue >= bracketsConfig[1].min && daysOverdue <= bracketsConfig[1].max) {
            docBracket = 'b1';
          } else if (daysOverdue >= bracketsConfig[2].min && daysOverdue <= bracketsConfig[2].max) {
            docBracket = 'b2';
          } else if (daysOverdue >= bracketsConfig[3].min && daysOverdue <= bracketsConfig[3].max) {
            docBracket = 'b3';
          } else {
            docBracket = 'b4';
          }
          return {
            ...doc,
            total,
            paid,
            balance,
            daysOverdue,
            docBracket
          };
        }),
        totalOriginal: p.totalOriginal || 0,
        saldoAlCorte: p.saldoAlCorte || 0,
        aVencer: p.aVencer || 0,
        b1: p.b1 || 0,
        b2: p.b2 || 0,
        b3: p.b3 || 0,
        b4: p.b4 || 0,
        totalVencido: p.vencidoTotal || 0,
        maxDaysOverdue: p.maxDaysOverdue || 0
      }));
    }

    // Cálculo local reactivo de alta precisión
    const cutoff = new Date(cutoffDate + 'T23:59:59');

    return providers.map(p => {
      // 1. Filtrar órdenes de compra emitidas en o antes de la fecha de corte
      const providerPOs = purchaseOrders
        .filter(po => {
          if (po.providerId !== p.id) return false;
          if (po.status === 'Cancelada') return false;
          if (po.date && new Date(po.date) > cutoff) return false; // Emitida en el futuro relativo al corte
          return true;
        })
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)); // Orden cronológico (FIFO)

      // 2. Filtrar abonos/pagos realizados en o antes de la fecha de corte
      const pPaymentsAtCutoff = providerPayments
        .filter(pm => {
          if (pm.providerId !== p.id) return false;
          if (pm.date && new Date(pm.date) > cutoff) return false; // Pagado después de la fecha de corte
          return true;
        });

      const totalPaidAtCutoff = pPaymentsAtCutoff.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
      let remainingAbonosToAllocate = totalPaidAtCutoff;

      let totalOriginal = 0;
      let totalSaldoAlCorte = 0;
      let aVencer = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let maxDaysOverdue = 0;

      const docs = providerPOs.map(po => {
        const poTotal = Number(po.totalAmount) || 0;
        totalOriginal += poTotal;

        // Asignación de abonos FIFO hasta la fecha de corte
        let paidForThisPO = 0;
        if (remainingAbonosToAllocate > 0) {
          paidForThisPO = Math.min(poTotal, remainingAbonosToAllocate);
          remainingAbonosToAllocate -= paidForThisPO;
        } else if (providerPayments.length === 0) {
          // Si no hay tabla histórica de pagos cargada, usar po.amountPaid
          paidForThisPO = Number(po.amountPaid) || 0;
        }

        const balanceAtCutoff = Math.max(0, poTotal - paidForThisPO);

        // Si la orden ya estaba totalmente liquidada a la fecha de corte, no genera pasivo
        if (balanceAtCutoff <= 0) return null;

        totalSaldoAlCorte += balanceAtCutoff;

        // Determinar fecha de vencimiento
        let due = po.dueDate ? new Date(po.dueDate) : null;
        if (!due && po.date) {
          due = new Date(new Date(po.date).getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        if (!due) due = new Date(po.date || cutoff);

        // Calcular días de atraso exactamente respecto a la fecha de corte seleccionada
        const diffTime = cutoff.getTime() - due.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysOverdue = diffDays > 0 ? diffDays : 0;

        if (daysOverdue > maxDaysOverdue) {
          maxDaysOverdue = daysOverdue;
        }

        let docBracket = 'b0';
        if (daysOverdue <= 0) {
          aVencer += balanceAtCutoff;
          docBracket = 'b0';
        } else if (daysOverdue >= bracketsConfig[1].min && daysOverdue <= bracketsConfig[1].max) {
          b1 += balanceAtCutoff;
          docBracket = 'b1';
        } else if (daysOverdue >= bracketsConfig[2].min && daysOverdue <= bracketsConfig[2].max) {
          b2 += balanceAtCutoff;
          docBracket = 'b2';
        } else if (daysOverdue >= bracketsConfig[3].min && daysOverdue <= bracketsConfig[3].max) {
          b3 += balanceAtCutoff;
          docBracket = 'b3';
        } else {
          b4 += balanceAtCutoff;
          docBracket = 'b4';
        }

        return {
          id: po.id,
          poNumber: po.poNumber,
          reference1: po.reference1,
          reference2: po.reference2,
          date: po.date,
          dueDate: po.dueDate || due.toISOString(),
          total: poTotal,
          paid: paidForThisPO,
          balance: balanceAtCutoff,
          daysOverdue,
          docBracket
        };
      }).filter(Boolean);

      // Si el proveedor no tiene órdenes desglosadas pero tiene saldo
      if (docs.length === 0 && (p.currentBalance || 0) > 0 && providerPOs.length === 0) {
        totalOriginal = p.currentBalance;
        totalSaldoAlCorte = p.currentBalance;
        b1 = p.currentBalance;
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
        saldoAlCorte: totalSaldoAlCorte,
        aVencer,
        b1,
        b2,
        b3,
        b4,
        totalVencido,
        maxDaysOverdue
      };
    });
  }, [providers, purchaseOrders, providerPayments, cutoffDate, bracketsConfig, serverAgingData]);

  // Filtros de búsqueda y saldo
  const filteredReport = useMemo(() => {
    return agingReport.filter(row => {
      if (onlyWithDebt && row.saldoAlCorte <= 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (row.name && row.name.toLowerCase().includes(q)) ||
        (row.rfc && row.rfc.toLowerCase().includes(q)) ||
        (row.phone && row.phone.toLowerCase().includes(q))
      );
    }).sort((a, b) => b.saldoAlCorte - a.saldoAlCorte);
  }, [agingReport, onlyWithDebt, search]);

  // Totales Generales para las Tarjetas KPI Superiores
  const grandTotals = useMemo(() => {
    return filteredReport.reduce((acc, row) => {
      acc.totalOriginal += row.totalOriginal;
      acc.saldoAlCorte += row.saldoAlCorte;
      acc.aVencer += row.aVencer;
      acc.b1 += row.b1;
      acc.b2 += row.b2;
      acc.b3 += row.b3;
      acc.b4 += row.b4;
      acc.totalVencido += row.totalVencido;
      return acc;
    }, {
      totalOriginal: 0,
      saldoAlCorte: 0,
      aVencer: 0,
      b1: 0,
      b2: 0,
      b3: 0,
      b4: 0,
      totalVencido: 0
    });
  }, [filteredReport]);

  const toggleExpand = (providerId) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  // Exportar a CSV / Excel
  const exportToCSV = () => {
    const headers = [
      'ID Proveedor',
      'Proveedor',
      'RFC',
      'Importe Original',
      'Saldo al Corte',
      'A Vencer',
      bracketsConfig[1].label,
      bracketsConfig[2].label,
      bracketsConfig[3].label,
      bracketsConfig[4].label,
      'Vencido Total',
      'Dias Vencido Maximo'
    ];

    const rows = filteredReport.map(r => [
      r.providerId,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.rfc || ''}"`,
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

    const csvContent = '\uFEFF' + [
      [`Reporte de Antiguedad de Saldos Proveedores - Fecha de Corte: ${cutoffDate}`],
      headers,
      ...rows,
      [
        'TOTALES',
        '',
        '',
        grandTotals.totalOriginal.toFixed(2),
        grandTotals.saldoAlCorte.toFixed(2),
        grandTotals.aVencer.toFixed(2),
        grandTotals.b1.toFixed(2),
        grandTotals.b2.toFixed(2),
        grandTotals.b3.toFixed(2),
        grandTotals.b4.toFixed(2),
        grandTotals.totalVencido.toFixed(2),
        ''
      ]
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Antiguedad_Saldos_Proveedores_${cutoffDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="antiguedad-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. BARRA SUPERIOR DE CONTROL Y CONFIGURACIÓN (Fiel a la captura) */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        {/* Fecha de corte interactiva */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              FECHA DE CORTE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
                {formattedCutoffDisplay}
              </div>
              <input 
                type="date"
                value={cutoffDate}
                onChange={e => setCutoffDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
                title="Selecciona la fecha histórica o presente para evaluar la deuda a ese día exacto"
              />
              <button 
                className="btn secondary small"
                style={{ padding: '5px 10px', fontSize: '12px' }}
                onClick={() => setCutoffDate(todayStr)}
                title="Volver a la fecha de hoy"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>

        {/* Selector de Intervalos de Días (10, 15, 30 o Personalizado) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
            Rango de días:
          </div>

          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            <button
              onClick={() => setIntervalType('10')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: intervalType === '10' ? '#ffffff' : 'transparent',
                color: intervalType === '10' ? '#0f172a' : '#64748b',
                boxShadow: intervalType === '10' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              1 a 10 días
            </button>

            <button
              onClick={() => setIntervalType('15')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: intervalType === '15' ? '#ffffff' : 'transparent',
                color: intervalType === '15' ? '#0f172a' : '#64748b',
                boxShadow: intervalType === '15' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              1 a 15 días
            </button>

            <button
              onClick={() => setIntervalType('30')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: intervalType === '30' ? '#ffffff' : 'transparent',
                color: intervalType === '30' ? '#0f172a' : '#64748b',
                boxShadow: intervalType === '30' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              1 a 30 días
            </button>

            <button
              onClick={() => setIntervalType('custom')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: intervalType === 'custom' ? '#ffffff' : 'transparent',
                color: intervalType === 'custom' ? '#0f172a' : '#64748b',
                boxShadow: intervalType === 'custom' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Personalizado
            </button>
          </div>

          {intervalType === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="number"
                min="1"
                max="180"
                value={customDays}
                onChange={e => setCustomDays(e.target.value)}
                style={{
                  width: '60px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  textAlign: 'center',
                  fontWeight: 700
                }}
              />
              <span className="muted" style={{ fontSize: '12px' }}>días</span>
            </div>
          )}

          {/* Badges de los rangos resultantes */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '6px' }}>
            {bracketsConfig.map(b => (
              <span
                key={b.id}
                style={{
                  background: b.pillColor,
                  color: b.textColor,
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid rgba(0,0,0,0.06)'
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. TARJETAS KPI DE RESUMEN (Fiel al diseño exacto de la imagen) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', 
          gap: '12px' 
        }}
      >
        {/* SALDO TOTAL */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SALDO TOTAL
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#1d4ed8', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.saldoAlCorte)}
          </div>
        </div>

        {/* A VENCER */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            A VENCER
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.aVencer)}
          </div>
        </div>

        {/* VENCIDO TOTAL */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            VENCIDO TOTAL
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.totalVencido)}
          </div>
        </div>

        {/* RANGO 1 */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[1].label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.b1)}
          </div>
        </div>

        {/* RANGO 2 */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[2].label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#c2410c', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.b2)}
          </div>
        </div>

        {/* RANGO 3 */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[3].label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.b3)}
          </div>
        </div>

        {/* RANGO 4 */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[4].label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#991b1b', marginTop: '6px' }}>
            {pesosDecimals(grandTotals.b4)}
          </div>
        </div>
      </div>

      {/* 3. TABLA MATRICIAL DE PROVEEDORES: Saldos por rango de antigüedad */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Header de la sección de la tabla */}
        <div 
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              PROVEEDORES: Saldos por rango de antigüedad
            </h3>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
              {filteredReport.length} proveedores con movimientos a la fecha de corte ({formattedCutoffDisplay})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Buscador */}
            <input 
              type="text"
              placeholder="🔍 Buscar proveedor o RFC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                width: '220px'
              }}
            />

            {/* Checkbox solo con deuda */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={onlyWithDebt}
                onChange={e => setOnlyWithDebt(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Solo con saldo &gt; $0
            </label>

            {/* Botón Exportar CSV */}
            <button 
              onClick={exportToCSV}
              className="btn secondary small"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 600 }}
            >
              📥 Exportar CSV
            </button>
          </div>
        </div>

        {/* Tabla Matricial */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table full" style={{ fontSize: '12.5px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 800, color: '#1e293b' }}>
                  PROVEEDOR
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>
                  IMPORTE ORIGINAL
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>
                  SALDO AL CORTE
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>
                  A VENCER
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#b45309' }}>
                  {bracketsConfig[1].label}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#c2410c' }}>
                  {bracketsConfig[2].label}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#dc2626' }}>
                  {bracketsConfig[3].label}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#991b1b' }}>
                  {bracketsConfig[4].label}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#dc2626' }}>
                  VENCIDO TOTAL
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>
                  DÍAS VENCIDO MÁXIMO
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredReport.map(r => {
                const isExpanded = !!expandedProviders[r.providerId];
                return (
                  <React.Fragment key={r.providerId}>
                    <tr 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: isExpanded ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Proveedor con botón acordeón */}
                      <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => toggleExpand(r.providerId)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: isExpanded ? '#0f172a' : '#ffffff',
                              color: isExpanded ? '#ffffff' : '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title={isExpanded ? 'Ocultar desglose de documentos' : 'Ver desglose de órdenes y facturas'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>

                          <div>
                            <span 
                              style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer', fontSize: '13px' }}
                              onClick={() => onSelectProviderForStatement && onSelectProviderForStatement(r)}
                              title="Consultar Estado de Cuenta de este proveedor"
                            >
                              {r.name}
                            </span>
                            <div className="muted" style={{ fontSize: '11px', marginTop: '1px' }}>
                              {r.rfc} {r.docsCount > 0 && `· ${r.docsCount} ${r.docsCount === 1 ? 'doc' : 'docs'}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Importe Original */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                        {pesosDecimals(r.totalOriginal)}
                      </td>

                      {/* Saldo al Corte */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: r.saldoAlCorte > 0 ? '#1d4ed8' : '#059669' }}>
                        {pesosDecimals(r.saldoAlCorte)}
                      </td>

                      {/* A Vencer */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        {pesosDecimals(r.aVencer)}
                      </td>

                      {/* Rango 1 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: r.b1 > 0 ? '#b45309' : '#94a3b8' }}>
                        {pesosDecimals(r.b1)}
                      </td>

                      {/* Rango 2 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: r.b2 > 0 ? '#c2410c' : '#94a3b8' }}>
                        {pesosDecimals(r.b2)}
                      </td>

                      {/* Rango 3 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: r.b3 > 0 ? '#dc2626' : '#94a3b8' }}>
                        {pesosDecimals(r.b3)}
                      </td>

                      {/* Rango 4 */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: r.b4 > 0 ? '#991b1b' : '#94a3b8' }}>
                        {pesosDecimals(r.b4)}
                      </td>

                      {/* Vencido Total */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: r.totalVencido > 0 ? '#dc2626' : '#059669' }}>
                        {pesosDecimals(r.totalVencido)}
                      </td>

                      {/* Días Vencido Máximo */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: r.maxDaysOverdue > 0 ? '#dc2626' : '#64748b' }}>
                        {r.maxDaysOverdue > 0 ? `${r.maxDaysOverdue} d` : '0 d'}
                      </td>
                    </tr>

                    {/* Desglose Expandible (+) de Documentos del Proveedor */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={10} style={{ padding: '12px 24px 20px 24px' }}>
                          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                                📄 Desglose de Órdenes de Compra y Facturas al corte ({formattedCutoffDisplay})
                              </span>
                              <button 
                                className="btn primary small"
                                style={{ fontSize: '11px', padding: '3px 8px' }}
                                onClick={() => onSelectProviderForStatement && onSelectProviderForStatement(r)}
                              >
                                Ir a Estado de Cuenta y Abonar ➜
                              </button>
                            </div>

                            {r.documents.length > 0 ? (
                              <table className="table full" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 10px' }}>Folio OC / Factura</th>
                                    <th style={{ padding: '8px 10px' }}>Fecha Emisión</th>
                                    <th style={{ padding: '8px 10px' }}>Vencimiento</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Días Atraso</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Original</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Abonos al Corte</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Saldo al Corte</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Rango Asignado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.documents.map(doc => (
                                    <tr key={doc.id || doc.poNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                                        {doc.poNumber}
                                        {doc.reference1 && <span className="muted" style={{ fontWeight: 400, marginLeft: '6px' }}>(Fact: {doc.reference1})</span>}
                                      </td>
                                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                        {doc.date ? doc.date.split('T')[0] : 'N/D'}
                                      </td>
                                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                        {doc.dueDate ? doc.dueDate.split('T')[0] : 'N/D'}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: doc.daysOverdue > 0 ? '#dc2626' : '#059669' }}>
                                        {doc.daysOverdue > 0 ? `${doc.daysOverdue} días` : 'Vigente'}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                        {pesosDecimals(doc.total)}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#059669' }}>
                                        {pesosDecimals(doc.paid)}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#d81921' }}>
                                        {pesosDecimals(doc.balance)}
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                        <span 
                                          style={{
                                            fontSize: '10.5px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: doc.daysOverdue <= 0 ? '#f1f5f9' : '#fee2e2',
                                            color: doc.daysOverdue <= 0 ? '#334155' : '#991b1b'
                                          }}
                                        >
                                          {doc.daysOverdue <= 0 ? 'A vencer' : `Vencido (${doc.daysOverdue} d)`}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="muted" style={{ padding: '10px 0', fontSize: '12px' }}>
                                Sin documentos detallados individuales a esta fecha de corte.
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
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    No se encontraron proveedores con saldo a la fecha de corte seleccionada.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Fila de Totales Generales (Pie de tabla) */}
            {filteredReport.length > 0 && (
              <tfoot>
                <tr 
                  style={{ 
                    background: '#f1f5f9', 
                    borderTop: '2px solid #cbd5e1', 
                    fontWeight: 900,
                    fontSize: '13px',
                    textAlign: 'right'
                  }}
                >
                  <td style={{ padding: '14px 16px', textAlign: 'left', color: '#0f172a' }}>
                    TOTALES GENERALES
                  </td>
                  <td style={{ padding: '14px 14px', color: '#1e293b' }}>
                    {pesosDecimals(grandTotals.totalOriginal)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#1d4ed8' }}>
                    {pesosDecimals(grandTotals.saldoAlCorte)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#0f172a' }}>
                    {pesosDecimals(grandTotals.aVencer)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#b45309' }}>
                    {pesosDecimals(grandTotals.b1)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#c2410c' }}>
                    {pesosDecimals(grandTotals.b2)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#dc2626' }}>
                    {pesosDecimals(grandTotals.b3)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#991b1b' }}>
                    {pesosDecimals(grandTotals.b4)}
                  </td>
                  <td style={{ padding: '14px 14px', color: '#dc2626' }}>
                    {pesosDecimals(grandTotals.totalVencido)}
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
