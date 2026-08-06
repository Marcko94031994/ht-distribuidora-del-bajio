import React, { useState, useMemo, useEffect } from 'react';
import { pesosDecimals } from '../utils/helpers';

export default function AntiguedadSaldosClientes({ data, onSelectClientForStatement }) {
  // Fecha de corte (por defecto hoy en formato YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [cutoffDate, setCutoffDate] = useState(todayStr);

  // Intervalo de días (10, 15, 30 o personalizado)
  const [intervalType, setIntervalType] = useState('30'); // '10', '15', '30', 'custom'
  const [customDays, setCustomDays] = useState(15);
  const [search, setSearch] = useState('');
  const [onlyWithDebt, setOnlyWithDebt] = useState(true);
  const [expandedClients, setExpandedClients] = useState({});
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

  // Clientes, Pedidos y Pagos desde el contexto
  const clients = useMemo(() => {
    return data.clientes && data.clientes.length > 0 
      ? data.clientes 
      : (data.rutas || []).flatMap(r => r.clients || []);
  }, [data.clientes, data.rutas]);

  const orders = useMemo(() => data.pedidos || [], [data.pedidos]);
  const clientPayments = useMemo(() => data.pagosClientes || [], [data.pagosClientes]);

  // Intentar cargar cálculo exacto del servidor cuando cambia la fecha de corte
  useEffect(() => {
    let isMounted = true;
    const fetchServerAging = async () => {
      try {
        setLoadingServer(true);
        const token = localStorage.getItem('ht_token');
        const res = await fetch(
          (import.meta.env.VITE_API_URL || '') + `/api/app/finance/cxc/aging?cutoffDate=${cutoffDate}&intervalDays=${intervalDays}`,
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
    if (serverAgingData && serverAgingData.clients) {
      return serverAgingData.clients.map(c => ({
        clientId: c.id,
        name: c.name,
        rfc: c.rfc || 'S/RFC',
        razonSocial: c.razonSocial,
        zone: c.zone || 'Sin Zona',
        phone: c.telefonos || c.celular || '-',
        creditLimit: c.creditLimit || 0,
        creditDays: c.creditDays || 30,
        docsCount: c.documents?.length || 0,
        documents: c.documents || [],
        totalOriginal: c.totalOriginal || 0,
        saldoAlCorte: c.saldoAlCorte || 0,
        aVencer: c.aVencer || 0,
        b1: c.b1 || 0,
        b2: c.b2 || 0,
        b3: c.b3 || 0,
        b4: c.b4 || 0,
        totalVencido: c.vencidoTotal || 0,
        maxDaysOverdue: c.maxDaysOverdue || 0
      }));
    }

    // Cálculo local reactivo de alta precisión
    const cutoff = new Date(cutoffDate + 'T23:59:59');

    return clients.map(c => {
      // 1. Filtrar pedidos a crédito emitidos en o antes de la fecha de corte
      const clientOrders = orders
        .filter(ord => {
          if (ord.clientId !== c.id) return false;
          if (ord.status === 'Cancelada') return false;
          if (ord.paymentMethod !== 'Crédito' && (ord.amountPaid || 0) >= (ord.totalAmount || 0)) return false;
          if (ord.date && new Date(ord.date) > cutoff) return false; // Emitida en el futuro relativo al corte
          return true;
        })
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)); // Orden cronológico (FIFO)

      // 2. Filtrar abonos/pagos realizados en o antes de la fecha de corte
      const cPaymentsAtCutoff = clientPayments
        .filter(pm => {
          if (pm.clientId !== c.id) return false;
          if (pm.date && new Date(pm.date) > cutoff) return false; // Pagado después de la fecha de corte
          return true;
        });

      const totalPaidAtCutoff = cPaymentsAtCutoff.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
      let remainingAbonosToAllocate = totalPaidAtCutoff;

      let totalOriginal = 0;
      let totalSaldoAlCorte = 0;
      let aVencer = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let maxDaysOverdue = 0;

      const docs = clientOrders.map(ord => {
        const ordTotal = Number(ord.totalAmount) || 0;
        totalOriginal += ordTotal;

        // Asignación de abonos FIFO hasta la fecha de corte
        let paidForThisOrd = 0;
        if (remainingAbonosToAllocate > 0) {
          paidForThisOrd = Math.min(ordTotal, remainingAbonosToAllocate);
          remainingAbonosToAllocate -= paidForThisOrd;
        } else if (clientPayments.length === 0) {
          paidForThisOrd = Number(ord.amountPaid) || 0;
        }

        const balanceAtCutoff = Math.max(0, ordTotal - paidForThisOrd);

        // Si la orden ya estaba totalmente liquidada a la fecha de corte, no genera saldo pendiente
        if (balanceAtCutoff <= 0) return null;

        totalSaldoAlCorte += balanceAtCutoff;

        // Determinar fecha de vencimiento
        let due = ord.dueDate ? new Date(ord.dueDate) : null;
        if (!due && ord.date) {
          const days = c.creditDays > 0 ? c.creditDays : 30;
          due = new Date(new Date(ord.date).getTime() + days * 24 * 60 * 60 * 1000);
        }
        if (!due) due = new Date(ord.date || cutoff);

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
          id: ord.id,
          orderNumber: ord.orderNumber,
          date: ord.date,
          dueDate: ord.dueDate || due.toISOString(),
          total: ordTotal,
          paid: paidForThisOrd,
          balance: balanceAtCutoff,
          daysOverdue,
          docBracket,
          isFacturado: ord.isFacturado,
          folioFiscal: ord.folioFiscal
        };
      }).filter(Boolean);

      // Si el cliente no tiene órdenes desglosadas pero tiene saldo actual
      if (docs.length === 0 && (c.currentBalance || 0) > 0 && clientOrders.length === 0) {
        totalOriginal = c.currentBalance;
        totalSaldoAlCorte = c.currentBalance;
        b1 = c.currentBalance;
        maxDaysOverdue = 1;
      }

      const totalVencido = b1 + b2 + b3 + b4;

      return {
        clientId: c.id,
        name: c.name,
        rfc: c.rfc || 'S/RFC',
        razonSocial: c.razonSocial,
        zone: c.zone || 'Sin Zona',
        phone: c.telefonos || c.celular || '-',
        creditLimit: c.creditLimit || 0,
        creditDays: c.creditDays || 30,
        docsCount: docs.length,
        documents: docs,
        totalOriginal: totalOriginal > 0 ? totalOriginal : (c.currentBalance || 0),
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
  }, [clients, orders, clientPayments, cutoffDate, bracketsConfig, serverAgingData]);

  // Filtros de búsqueda y saldo
  const filteredReport = useMemo(() => {
    return agingReport.filter(row => {
      if (onlyWithDebt && row.saldoAlCorte <= 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (row.name && row.name.toLowerCase().includes(q)) ||
        (row.rfc && row.rfc.toLowerCase().includes(q)) ||
        (row.zone && row.zone.toLowerCase().includes(q)) ||
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

  const toggleExpand = (clientId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  // Exportar a CSV / Excel
  const exportToCSV = () => {
    const headers = [
      'ID Cliente',
      'Cliente',
      'RFC',
      'Zona',
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
      r.clientId,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.rfc || ''}"`,
      `"${r.zone || ''}"`,
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
      [`Reporte de Antiguedad de Saldos Clientes (CxC) - Fecha de Corte: ${cutoffDate}`],
      headers,
      ...rows,
      [
        'TOTALES',
        '',
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
    link.setAttribute('download', `Antiguedad_Saldos_Clientes_${cutoffDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="antiguedad-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. BARRA SUPERIOR DE CONTROL Y CONFIGURACIÓN */}
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
                onClick={() => setCutoffDate(todayStr)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: cutoffDate === todayStr ? '#2563eb' : '#f1f5f9',
                  color: cutoffDate === todayStr ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Hoy
              </button>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              {cutoffDate === todayStr ? '🟢 Cartera en tiempo real' : '⏳ Histórico evaluado al corte'}
            </div>
          </div>
        </div>

        {/* Selector dinámico de rangos de días */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            RANGOS DE ANTIGÜEDAD
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: '10', label: '1 a 10 días' },
              { id: '15', label: '1 a 15 días' },
              { id: '30', label: '1 a 30 días' },
              { id: 'custom', label: 'Personalizado' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setIntervalType(opt.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: intervalType === opt.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: intervalType === opt.id ? '#eff6ff' : '#ffffff',
                  color: intervalType === opt.id ? '#1e40af' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: intervalType === opt.id ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {opt.label}
              </button>
            ))}

            {intervalType === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  style={{
                    width: '60px',
                    padding: '5px 8px',
                    borderRadius: '8px',
                    border: '1px solid #2563eb',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>días/rango</span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={exportToCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            📊 Exportar Excel/CSV
          </button>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE TOTALES / RESUMEN EJECUTIVO */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '12px' 
        }}
      >
        {/* TOTAL POR COBRAR */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #cbd5e1',
            borderLeft: '5px solid #2563eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SALDO POR COBRAR
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e3a8a', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.saldoAlCorte)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {filteredReport.filter(r => r.saldoAlCorte > 0).length} clientes con saldo
          </div>
        </div>

        {/* A VENCER (VIGENTE) */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #cbd5e1',
            borderLeft: '5px solid #059669',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            A VENCER (VIGENTE)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.aVencer)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            En plazo de crédito
          </div>
        </div>

        {/* VENCIDO TOTAL */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #cbd5e1',
            borderLeft: '5px solid #dc2626',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            VENCIDO TOTAL
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#991b1b', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.totalVencido)}
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
            Cartera en mora
          </div>
        </div>

        {/* RANGO 1 */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #d97706',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[1].label} DÍAS
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#92400e', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.b1)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Mora inicial
          </div>
        </div>

        {/* RANGO 2 */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #ea580c',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[2].label} DÍAS
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#9a3412', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.b2)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Mora media
          </div>
        </div>

        {/* RANGO 3 */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #e11d48',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[3].label} DÍAS
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#9f1239', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.b3)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Mora alta
          </div>
        </div>

        {/* RANGO 4 */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #881337',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#881337', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {bracketsConfig[4].label} DÍAS
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#881337', marginTop: '4px' }}>
            {pesosDecimals(grandTotals.b4)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Mora crítica
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BÚSQUEDA Y FILTROS */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre de cliente, RFC, zona o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyWithDebt}
              onChange={e => setOnlyWithDebt(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <b>Solo clientes con saldo al corte</b>
          </label>

          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
            Mostrando <b>{filteredReport.length}</b> clientes
          </span>
        </div>
      </div>

      {/* 4. TABLA PRINCIPAL DE ANTIGÜEDAD DE SALDOS */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflowX: 'auto'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👥 CLIENTES: Saldos por rango de antigüedad
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Corte evaluado al: <b>{cutoffDate}</b>
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: '40px' }}></th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>CLIENTE</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>IMPORTE ORIGINAL</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', background: '#f1f5f9', color: '#0f172a' }}>SALDO AL CORTE</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', color: '#059669' }}>A VENCER</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', color: '#92400e' }}>{bracketsConfig[1].label}</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', color: '#9a3412' }}>{bracketsConfig[2].label}</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', color: '#9f1239' }}>{bracketsConfig[3].label}</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', color: '#881337' }}>{bracketsConfig[4].label}</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', color: '#dc2626' }}>VENCIDO TOTAL</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>ATRASO MÁX.</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredReport.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No se encontraron clientes con el criterio seleccionado.
                </td>
              </tr>
            ) : (
              filteredReport.map(r => {
                const isExpanded = expandedClients[r.clientId];
                return (
                  <React.Fragment key={r.clientId}>
                    <tr 
                      style={{ 
                        borderBottom: '1px solid #e2e8f0', 
                        background: isExpanded ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Botón acordeón */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {r.docsCount > 0 ? (
                          <button
                            onClick={() => toggleExpand(r.clientId)}
                            style={{
                              background: isExpanded ? '#2563eb' : '#f1f5f9',
                              color: isExpanded ? '#ffffff' : '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              width: '24px',
                              height: '24px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 900,
                              fontSize: '12px'
                            }}
                            title={isExpanded ? "Ocultar remisiones" : "Ver desglose de remisiones"}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>•</span>
                        )}
                      </td>

                      {/* Nombre y datos del cliente */}
                      <td style={{ padding: '10px 14px', textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>RFC: <b>{r.rfc}</b></span>
                          <span>•</span>
                          <span>Zona: <b>{r.zone}</b></span>
                          {r.docsCount > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#2563eb', fontWeight: 700 }}>{r.docsCount} remisión(es)</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Importe Original */}
                      <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>
                        {pesosDecimals(r.totalOriginal)}
                      </td>

                      {/* Saldo al Corte */}
                      <td style={{ padding: '10px 14px', background: '#f1f5f9', fontWeight: 900, color: r.saldoAlCorte > 0 ? '#1e3a8a' : '#64748b' }}>
                        {pesosDecimals(r.saldoAlCorte)}
                      </td>

                      {/* A Vencer */}
                      <td style={{ padding: '10px 14px', color: r.aVencer > 0 ? '#059669' : '#cbd5e1', fontWeight: r.aVencer > 0 ? 800 : 500 }}>
                        {r.aVencer > 0 ? pesosDecimals(r.aVencer) : '-'}
                      </td>

                      {/* Rango 1 */}
                      <td style={{ padding: '10px 14px', color: r.b1 > 0 ? '#92400e' : '#cbd5e1', fontWeight: r.b1 > 0 ? 800 : 500 }}>
                        {r.b1 > 0 ? pesosDecimals(r.b1) : '-'}
                      </td>

                      {/* Rango 2 */}
                      <td style={{ padding: '10px 14px', color: r.b2 > 0 ? '#9a3412' : '#cbd5e1', fontWeight: r.b2 > 0 ? 800 : 500 }}>
                        {r.b2 > 0 ? pesosDecimals(r.b2) : '-'}
                      </td>

                      {/* Rango 3 */}
                      <td style={{ padding: '10px 14px', color: r.b3 > 0 ? '#9f1239' : '#cbd5e1', fontWeight: r.b3 > 0 ? 800 : 500 }}>
                        {r.b3 > 0 ? pesosDecimals(r.b3) : '-'}
                      </td>

                      {/* Rango 4 */}
                      <td style={{ padding: '10px 14px', color: r.b4 > 0 ? '#881337' : '#cbd5e1', fontWeight: r.b4 > 0 ? 800 : 500 }}>
                        {r.b4 > 0 ? pesosDecimals(r.b4) : '-'}
                      </td>

                      {/* Vencido Total */}
                      <td style={{ padding: '10px 14px', color: r.totalVencido > 0 ? '#dc2626' : '#cbd5e1', fontWeight: r.totalVencido > 0 ? 900 : 500 }}>
                        {r.totalVencido > 0 ? pesosDecimals(r.totalVencido) : '-'}
                      </td>

                      {/* Atraso Máximo */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {r.maxDaysOverdue > 0 ? (
                          <span 
                            style={{
                              background: r.maxDaysOverdue > 60 ? '#fee2e2' : '#fef3c7',
                              color: r.maxDaysOverdue > 60 ? '#991b1b' : '#92400e',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}
                          >
                            {r.maxDaysOverdue} días
                          </span>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>Al corriente</span>
                        )}
                      </td>

                      {/* Botón Acción para ir a Estado de Cuenta */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => onSelectClientForStatement && onSelectClientForStatement(r)}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Abrir Estado de Cuenta y Registro de Abonos"
                        >
                          Cobranza ➜
                        </button>
                      </td>
                    </tr>

                    {/* Desglose de Remisiones / Pedidos en Acordeón */}
                    {isExpanded && r.documents.length > 0 && (
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <td colSpan="12" style={{ padding: '12px 20px 20px 40px', textAlign: 'left' }}>
                          <div 
                            style={{
                              background: '#ffffff',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              padding: '14px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>📄 Remisiones / Pedidos a Crédito de <b>{r.name}</b> al corte ({cutoffDate}):</span>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Cálculo FIFO de abonos al corte</span>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'right' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #cbd5e1' }}>
                                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Folio Pedido</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Fecha Emisión</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Fecha Vencimiento</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Días Atraso al Corte</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Importe Original</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#059669' }}>Abonos al Corte</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#1e3a8a', fontWeight: 800 }}>Saldo al Corte</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Rango Asignado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.documents.map((doc, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>
                                      {doc.orderNumber}
                                      {doc.isFacturado && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px' }}>SAT</span>}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>
                                      {doc.date ? doc.date.split('T')[0] : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>
                                      {doc.dueDate ? doc.dueDate.split('T')[0] : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                      {doc.daysOverdue > 0 ? (
                                        <span style={{ color: '#dc2626', fontWeight: 800 }}>
                                          {doc.daysOverdue} días
                                        </span>
                                      ) : (
                                        <span style={{ color: '#059669', fontWeight: 700 }}>
                                          Vigente
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '6px 10px' }}>
                                      {pesosDecimals(doc.total)}
                                    </td>
                                    <td style={{ padding: '6px 10px', color: '#059669', fontWeight: 700 }}>
                                      {pesosDecimals(doc.paid)}
                                    </td>
                                    <td style={{ padding: '6px 10px', color: '#1e3a8a', fontWeight: 900 }}>
                                      {pesosDecimals(doc.balance)}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                      <span 
                                        style={{
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          background: doc.docBracket === 'b0' ? '#ecfdf5' : '#fee2e2',
                                          color: doc.docBracket === 'b0' ? '#065f46' : '#991b1b'
                                        }}
                                      >
                                        {bracketsConfig.find(b => b.id === doc.docBracket)?.label || 'A vencer'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Fila de Totales Generales fija */}
          {filteredReport.length > 0 && (
            <tfoot>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 900, fontSize: '13px' }}>
                <td style={{ padding: '14px', textAlign: 'center' }}>∑</td>
                <td style={{ padding: '14px', textAlign: 'left' }}>TOTALES GENERALES AL CORTE</td>
                <td style={{ padding: '14px' }}>{pesosDecimals(grandTotals.totalOriginal)}</td>
                <td style={{ padding: '14px', background: '#1e293b' }}>{pesosDecimals(grandTotals.saldoAlCorte)}</td>
                <td style={{ padding: '14px', color: '#34d399' }}>{pesosDecimals(grandTotals.aVencer)}</td>
                <td style={{ padding: '14px', color: '#fde68a' }}>{pesosDecimals(grandTotals.b1)}</td>
                <td style={{ padding: '14px', color: '#fed7aa' }}>{pesosDecimals(grandTotals.b2)}</td>
                <td style={{ padding: '14px', color: '#fecdd3' }}>{pesosDecimals(grandTotals.b3)}</td>
                <td style={{ padding: '14px', color: '#fda4af' }}>{pesosDecimals(grandTotals.b4)}</td>
                <td style={{ padding: '14px', color: '#f87171' }}>{pesosDecimals(grandTotals.totalVencido)}</td>
                <td style={{ padding: '14px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '14px', textAlign: 'center' }}>-</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
