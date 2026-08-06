import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pesos, pesosDecimals } from '../utils/helpers';

export default function PagoAProveedores({ data, reloadState, preSelectedProviderId, onSelectProviderForStatement }) {
  const location = useLocation();
  const initialProvId = preSelectedProviderId || location.state?.providerId || null;
  const [selectedProviderId, setSelectedProviderId] = useState(initialProvId);

  useEffect(() => {
    if (preSelectedProviderId) {
      setSelectedProviderId(preSelectedProviderId);
    } else if (location.state?.providerId) {
      setSelectedProviderId(location.state.providerId);
    }
  }, [preSelectedProviderId, location.state]);
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Payment form state
  const [paymentHeader, setPaymentHeader] = useState({
    method: 'Transferencia SPEI',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Selected invoices allocation: { [poId]: { selected: boolean, amountToPay: number, fullBalance: number } }
  const [invoiceAllocations, setInvoiceAllocations] = useState({});

  // Providers list
  const providers = useMemo(() => data.proveedores || [], [data.proveedores]);
  const purchaseOrders = useMemo(() => data.ordenesCompra || [], [data.ordenesCompra]);

  // Selected provider object
  const selectedProvider = useMemo(() => {
    return providers.find(p => p.id === Number(selectedProviderId)) || null;
  }, [providers, selectedProviderId]);

  // Portfolio with balances
  const providersWithDebt = useMemo(() => {
    const now = new Date();
    return providers.map(p => {
      const pPOs = purchaseOrders.filter(po => 
        po.providerId === p.id && 
        po.status !== 'Cancelada' && 
        (po.amountPaid || 0) < (po.totalAmount || 0)
      );

      const overduePOs = pPOs.filter(po => po.dueDate && new Date(po.dueDate) < now);
      const totalBalance = p.currentBalance || 0;
      const overdueBalance = overduePOs.reduce((sum, po) => sum + ((po.totalAmount || 0) - (po.amountPaid || 0)), 0);

      return {
        ...p,
        pendingPOsCount: pPOs.length,
        overduePOsCount: overduePOs.length,
        totalBalance,
        overdueBalance,
        hasOverdue: overduePOs.length > 0
      };
    }).filter(p => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.rfc && p.rfc.toLowerCase().includes(term)) ||
        (p.contact && p.contact.toLowerCase().includes(term))
      );
    }).sort((a, b) => (b.totalBalance || 0) - (a.totalBalance || 0));
  }, [providers, purchaseOrders, searchTerm]);

  // Load statement when provider changes
  useEffect(() => {
    if (!selectedProviderId) {
      setStatement(null);
      setInvoiceAllocations({});
      return;
    }

    const loadProviderStatement = async () => {
      setLoadingStatement(true);
      try {
        const token = localStorage.getItem('ht_token');
        const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/provider/${selectedProviderId}/statement`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setStatement(json);
          // Initialize allocations with all unpaid POs
          const allocs = {};
          (json.purchaseOrders || []).forEach(po => {
            const balance = (Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0);
            if (balance > 0) {
              allocs[po.id] = {
                selected: false,
                amountToPay: balance,
                fullBalance: balance
              };
            }
          });
          setInvoiceAllocations(allocs);
        } else {
          // Fallback from local state
          const localPOs = purchaseOrders.filter(po => po.providerId === Number(selectedProviderId) && po.status !== 'Cancelada');
          setStatement({ provider: selectedProvider, purchaseOrders: localPOs, payments: [] });
          const allocs = {};
          localPOs.forEach(po => {
            const balance = (Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0);
            if (balance > 0) {
              allocs[po.id] = {
                selected: false,
                amountToPay: balance,
                fullBalance: balance
              };
            }
          });
          setInvoiceAllocations(allocs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStatement(false);
      }
    };

    loadProviderStatement();
  }, [selectedProviderId, purchaseOrders, selectedProvider]);

  // Pending purchase orders from statement
  const pendingInvoices = useMemo(() => {
    if (!statement || !statement.purchaseOrders) return [];
    return statement.purchaseOrders.filter(po => {
      const balance = (Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0);
      if (balance <= 0) return false;
      if (!invoiceSearch) return true;
      const term = invoiceSearch.toLowerCase();
      return (
        (po.poNumber && po.poNumber.toLowerCase().includes(term)) ||
        (po.reference1 && po.reference1.toLowerCase().includes(term)) ||
        (po.reference2 && po.reference2.toLowerCase().includes(term))
      );
    });
  }, [statement, invoiceSearch]);

  // Summary calculations of selected payments
  const paymentSummary = useMemo(() => {
    let totalSelectedAmount = 0;
    let selectedCount = 0;

    Object.keys(invoiceAllocations).forEach(poId => {
      const alloc = invoiceAllocations[poId];
      if (alloc && alloc.selected) {
        selectedCount += 1;
        totalSelectedAmount += Number(alloc.amountToPay) || 0;
      }
    });

    const currentProviderDebt = selectedProvider?.currentBalance || 0;
    const remainingDebt = Math.max(0, currentProviderDebt - totalSelectedAmount);

    return {
      totalSelectedAmount,
      selectedCount,
      currentProviderDebt,
      remainingDebt
    };
  }, [invoiceAllocations, selectedProvider]);

  // Checkbox toggle handler
  const handleToggleInvoice = (poId, fullBalance) => {
    setInvoiceAllocations(prev => {
      const current = prev[poId] || { selected: false, amountToPay: fullBalance, fullBalance };
      const nextSelected = !current.selected;
      return {
        ...prev,
        [poId]: {
          selected: nextSelected,
          amountToPay: nextSelected ? (current.amountToPay > 0 ? current.amountToPay : fullBalance) : current.amountToPay,
          fullBalance
        }
      };
    });
  };

  // Amount input change handler
  const handleAmountChange = (poId, value, fullBalance) => {
    const num = Number(value);
    setInvoiceAllocations(prev => ({
      ...prev,
      [poId]: {
        selected: num > 0,
        amountToPay: Math.min(fullBalance, Math.max(0, num)),
        fullBalance
      }
    }));
  };

  // Quick selection helpers
  const handleSelectAll = () => {
    const next = { ...invoiceAllocations };
    pendingInvoices.forEach(po => {
      const balance = (Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0);
      next[po.id] = {
        selected: true,
        amountToPay: balance,
        fullBalance: balance
      };
    });
    setInvoiceAllocations(next);
  };

  const handleSelectOverdueOnly = () => {
    const now = new Date();
    const next = { ...invoiceAllocations };
    pendingInvoices.forEach(po => {
      const isOverdue = po.isOverdue || (po.dueDate && new Date(po.dueDate) < now);
      const balance = (Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0);
      if (isOverdue) {
        next[po.id] = {
          selected: true,
          amountToPay: balance,
          fullBalance: balance
        };
      } else {
        next[po.id] = {
          selected: false,
          amountToPay: balance,
          fullBalance: balance
        };
      }
    });
    setInvoiceAllocations(next);
  };

  const handleDeselectAll = () => {
    const next = { ...invoiceAllocations };
    Object.keys(next).forEach(poId => {
      next[poId] = {
        ...next[poId],
        selected: false
      };
    });
    setInvoiceAllocations(next);
  };

  // Submit payment
  const handleConfirmAndPay = async () => {
    if (paymentSummary.selectedCount === 0 || paymentSummary.totalSelectedAmount <= 0) {
      alert('Por favor seleccione al menos una factura u orden de compra para aplicar el pago.');
      return;
    }

    if (!paymentHeader.reference) {
      if (!window.confirm('No ha especificado una Referencia Bancaria o Folio SPEI. ¿Desea continuar de todos modos?')) {
        return;
      }
    }

    const itemsToPay = [];
    Object.keys(invoiceAllocations).forEach(poId => {
      const alloc = invoiceAllocations[poId];
      if (alloc && alloc.selected && alloc.amountToPay > 0) {
        itemsToPay.push({
          purchaseOrderId: Number(poId),
          amount: Number(alloc.amountToPay)
        });
      }
    });

    const confirmMsg = `¿Confirma aplicar el pago por ${pesosDecimals(paymentSummary.totalSelectedAmount)} a ${paymentSummary.selectedCount} factura(s) de ${selectedProvider.name}?\n\nMétodo: ${paymentHeader.method}\nReferencia: ${paymentHeader.reference || 'Sin referencia'}`;
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('ht_token');
      const payload = {
        providerId: selectedProvider.id,
        amount: paymentSummary.totalSelectedAmount,
        reference: paymentHeader.reference ? `${paymentHeader.reference} (${itemsToPay.length} facturas)` : `Pago a ${itemsToPay.length} facturas`,
        paymentMethod: paymentHeader.method,
        purchaseOrderPayments: itemsToPay
      };

      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/provider-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`✅ Pago de ${pesosDecimals(paymentSummary.totalSelectedAmount)} aplicado exitosamente a las facturas seleccionadas.`);
        if (reloadState) await reloadState();
        // Reset selections & refresh statement
        setPaymentHeader(prev => ({ ...prev, reference: '', notes: '' }));
        // Reload provider statement
        const sRes = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/provider/${selectedProvider.id}/statement`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (sRes.ok) {
          const json = await sRes.json();
          setStatement(json);
          const allocs = {};
          (json.purchaseOrders || []).forEach(po => {
            const balance = (Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0);
            if (balance > 0) {
              allocs[po.id] = { selected: false, amountToPay: balance, fullBalance: balance };
            }
          });
          setInvoiceAllocations(allocs);
        }
      } else {
        const err = await res.text();
        alert('Error al procesar el pago: ' + err);
      }
    } catch (e) {
      alert('Error de conexión: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pago-proveedores-module animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. SECCIÓN SUPERIOR: ENCABEZADO Y CONFIGURACIÓN DEL PAGO */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Header Title & Provider Picker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: '1 1 340px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>💳</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Módulo de Pago a Proveedores
              </h2>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
              Seleccione el proveedor en el encabezado y marque en la parte inferior las facturas / órdenes de compra específicas a liquidar o abonar.
            </p>
          </div>

          {/* Provider Dropdown Selector */}
          <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🏢 Seleccionar Proveedor a Liquidar:
            </label>
            <select
              value={selectedProviderId || ''}
              onChange={(e) => setSelectedProviderId(e.target.value ? Number(e.target.value) : null)}
              style={{
                padding: '11px 14px',
                borderRadius: '9px',
                border: '2px solid #cbd5e1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
                background: '#f8fafc',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            >
              <option value="">-- Elija un Proveedor de la Cartera --</option>
              {providersWithDebt.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.rfc ? `(${p.rfc})` : ''} — Saldo Deudor: {pesosDecimals(p.totalBalance)} {p.hasOverdue ? '⚠️ [VENCIDO]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Provider Info Banner & Payment Parameters */}
        {selectedProvider ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            
            {/* Provider Details Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }}>
                  {selectedProvider.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{selectedProvider.name}</h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>RFC: {selectedProvider.rfc || 'Sin RFC'} · Tel: {selectedProvider.phone || 'N/A'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px' }}>
                <span style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, color: '#334155' }}>
                  📅 Crédito: {selectedProvider.creditDays || 0} días
                </span>
                <span style={{ background: (selectedProvider.currentBalance || 0) > 0 ? '#fee2e2' : '#dcfce7', color: (selectedProvider.currentBalance || 0) > 0 ? '#991b1b' : '#166534', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Saldo Actual: {pesosDecimals(selectedProvider.currentBalance || 0)}
                </span>
              </div>
            </div>

            {/* Payment Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Forma de Pago:
                  </label>
                  <select
                    value={paymentHeader.method}
                    onChange={(e) => setPaymentHeader({ ...paymentHeader, method: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                  >
                    <option value="Transferencia SPEI">Transferencia SPEI</option>
                    <option value="Cheque Nominativo">Cheque Nominativo</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta de Débito/Crédito">Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Fecha Aplicación:
                  </label>
                  <input
                    type="date"
                    value={paymentHeader.date}
                    onChange={(e) => setPaymentHeader({ ...paymentHeader, date: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Referencia Bancaria / Folio SPEI / No. Cheque:
                </label>
                <input
                  type="text"
                  placeholder="Ej. SPEI-984021 / Cheque #402"
                  value={paymentHeader.reference}
                  onChange={(e) => setPaymentHeader({ ...paymentHeader, reference: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                />
              </div>
            </div>

            {/* Live Financial Summary & Pay Button */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL A PAGAR:</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: paymentSummary.totalSelectedAmount > 0 ? '#16a34a' : '#94a3b8' }}>
                  {pesosDecimals(paymentSummary.totalSelectedAmount)}
                </span>
              </div>

              <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginBottom: '10px' }}>
                <span>Facturas marcadas: <b>{paymentSummary.selectedCount}</b></span>
                <span>Saldo restante: <b>{pesosDecimals(paymentSummary.remainingDebt)}</b></span>
              </div>

              <button
                onClick={handleConfirmAndPay}
                disabled={submitting || paymentSummary.selectedCount === 0 || paymentSummary.totalSelectedAmount <= 0}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: paymentSummary.totalSelectedAmount > 0 ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: paymentSummary.totalSelectedAmount > 0 && !submitting ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: paymentSummary.totalSelectedAmount > 0 ? '0 3px 8px rgba(22, 163, 74, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>💳</span>
                <span>{submitting ? 'Procesando Pago...' : `Aplicar Pago (${pesos(paymentSummary.totalSelectedAmount)})`}</span>
              </button>
            </div>

          </div>
        ) : (
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '10px', textAlign: 'center', border: '1.5px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
              👆 Seleccione un proveedor en el menú superior para cargar sus facturas pendientes y configurar el pago.
            </p>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN INFERIOR: FACTURAS / ÓRDENES DE COMPRA A PAGAR (FULL WIDTH) */}
      {selectedProvider && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Subheader & Quick Tools */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📑</span> Facturas y Órdenes de Compra a Liquidar
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Marque las casillas de las facturas que incluye este pago e indique el monto exacto a abonar en cada una.
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSelectOverdueOnly}
                style={{
                  padding: '7px 12px',
                  borderRadius: '7px',
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚠️ Marcar Solo Vencidas
              </button>

              <button
                onClick={handleSelectAll}
                style={{
                  padding: '7px 12px',
                  borderRadius: '7px',
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1e40af',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✓ Marcar Todas
              </button>

              <button
                onClick={handleDeselectAll}
                style={{
                  padding: '7px 12px',
                  borderRadius: '7px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✕ Desmarcar
              </button>

              <input
                type="text"
                placeholder="🔍 Filtrar facturas..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  width: '160px'
                }}
              />
            </div>
          </div>

          {/* Full Width Invoices Table */}
          {loadingStatement ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              Cargando facturas y órdenes de compra del proveedor...
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '32px' }}>🎉</span>
              <h4 style={{ margin: '8px 0 4px', fontSize: '16px', color: '#0f172a' }}>No hay facturas pendientes de pago</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Este proveedor se encuentra al corriente con todos sus compromisos y órdenes de compra.
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center' }}>Pagar</th>
                    <th style={{ padding: '12px 14px' }}>Folio OC</th>
                    <th style={{ padding: '12px 14px' }}>Factura Fiscal / Ref</th>
                    <th style={{ padding: '12px 14px' }}>Emisión</th>
                    <th style={{ padding: '12px 14px' }}>Vencimiento</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Factura</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Abonado</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Pendiente</th>
                    <th style={{ padding: '12px 14px', width: '180px', textAlign: 'right', background: '#f1f5f9' }}>Monto a Pagar ($)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Posterior</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((po) => {
                    const total = Number(po.totalAmount) || 0;
                    const paid = Number(po.amountPaid) || 0;
                    const balance = total - paid;
                    const alloc = invoiceAllocations[po.id] || { selected: false, amountToPay: balance, fullBalance: balance };
                    const isSelected = !!alloc.selected;
                    const amountToPay = isSelected ? (Number(alloc.amountToPay) || 0) : 0;
                    const postBalance = Math.max(0, balance - amountToPay);

                    const now = new Date();
                    const isOverdue = po.isOverdue || (po.dueDate && new Date(po.dueDate) < now);
                    const daysOverdue = po.daysOverdue || (po.dueDate && new Date(po.dueDate) < now ? Math.floor((now - new Date(po.dueDate)) / (1000 * 60 * 60 * 24)) : 0);

                    return (
                      <tr 
                        key={po.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f0fdf4' : (isOverdue ? '#fff5f5' : '#ffffff'),
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleInvoice(po.id, balance)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                          />
                        </td>

                        {/* Folio OC */}
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                            {po.poNumber || `OC-${po.id}`}
                          </span>
                        </td>

                        {/* Factura / Ref */}
                        <td style={{ padding: '12px 14px' }}>
                          {po.reference1 ? (
                            <span style={{ fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid #dbeafe' }}>
                              🧾 {po.reference1}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Sin factura fiscal</span>
                          )}
                        </td>

                        {/* Fecha Emision */}
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12px' }}>
                          {po.date ? new Date(po.date).toLocaleDateString('es-MX') : 'N/A'}
                        </td>

                        {/* Fecha Vencimiento */}
                        <td style={{ padding: '12px 14px' }}>
                          {po.dueDate ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', color: isOverdue ? '#dc2626' : '#475569', fontWeight: isOverdue ? 700 : 500 }}>
                                {new Date(po.dueDate).toLocaleDateString('es-MX')}
                              </span>
                              {isOverdue ? (
                                <span style={{ fontSize: '10px', color: '#b91c1c', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', width: 'fit-content', fontWeight: 700 }}>
                                  Vencida ({daysOverdue} d)
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px', width: 'fit-content' }}>
                                  En plazo
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Inmediato</span>
                          )}
                        </td>

                        {/* Total Factura */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                          {pesosDecimals(total)}
                        </td>

                        {/* Abonado */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: paid > 0 ? '#16a34a' : '#94a3b8', fontWeight: paid > 0 ? 700 : 400 }}>
                          {pesosDecimals(paid)}
                        </td>

                        {/* Saldo Pendiente */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                          {pesosDecimals(balance)}
                        </td>

                        {/* Monto a Pagar Input */}
                        <td style={{ padding: '8px 14px', textAlign: 'right', background: isSelected ? '#ecfdf5' : '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <input
                              type="number"
                              min="0"
                              max={balance}
                              step="0.01"
                              value={isSelected ? alloc.amountToPay : ''}
                              placeholder={isSelected ? '0.00' : '$ 0.00'}
                              onChange={(e) => handleAmountChange(po.id, e.target.value, balance)}
                              disabled={!isSelected}
                              style={{
                                width: '110px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #16a34a' : '1px solid #cbd5e1',
                                textAlign: 'right',
                                fontWeight: 800,
                                fontSize: '13px',
                                color: isSelected ? '#15803d' : '#94a3b8',
                                background: isSelected ? '#ffffff' : '#f1f5f9',
                                outline: 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleAmountChange(po.id, balance, balance);
                              }}
                              disabled={!isSelected}
                              title="Pagar saldo total de esta factura"
                              style={{
                                padding: '4px 6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: '#e2e8f0',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isSelected ? 'pointer' : 'default',
                                color: '#334155'
                              }}
                            >
                              MAX
                            </button>
                          </div>
                        </td>

                        {/* Saldo Posterior */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: postBalance === 0 ? '#16a34a' : '#b45309' }}>
                          {postBalance === 0 && isSelected ? '✅ Liquidada' : pesosDecimals(postBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sticky Bottom Action Bar when items selected */}
          {paymentSummary.selectedCount > 0 && (
            <div
              style={{
                position: 'sticky',
                bottom: '16px',
                zIndex: 100,
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                border: '1px solid #334155'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  📑 {paymentSummary.selectedCount} factura(s) seleccionada(s)
                </span>
                <span style={{ color: '#94a3b8' }}>|</span>
                <span style={{ fontSize: '14px' }}>
                  Total a abonar: <b style={{ color: '#4ade80', fontSize: '16px' }}>{pesosDecimals(paymentSummary.totalSelectedAmount)}</b>
                </span>
                <span style={{ color: '#94a3b8' }}>|</span>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  Método: <b>{paymentHeader.method}</b>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDeselectAll}
                  style={{
                    padding: '8px 14px',
                    background: 'transparent',
                    border: '1px solid #475569',
                    borderRadius: '7px',
                    color: '#e2e8f0',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar Selección
                </button>

                <button
                  onClick={handleConfirmAndPay}
                  disabled={submitting}
                  style={{
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: 'none',
                    borderRadius: '7px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(22,163,74,0.4)'
                  }}
                >
                  <span>💳</span>
                  <span>{submitting ? 'Procesando...' : `Confirmar y Aplicar Pago (${pesos(paymentSummary.totalSelectedAmount)})`}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. VISTA CUANDO NO HAY PROVEEDOR SELECCIONADO: TABLA DE CARTERA GLOBAL */}
      {!selectedProvider && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Cartera de Proveedores con Pasivos Pendientes
            </h3>
            <input
              type="text"
              placeholder="🔍 Buscar proveedor por nombre o RFC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                width: '280px'
              }}
            />
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Proveedor / Razón Social</th>
                  <th style={{ padding: '12px 14px' }}>RFC</th>
                  <th style={{ padding: '12px 14px' }}>Contacto / Tel</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Facturas Pendientes</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Vencido</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Total Deudor</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {providersWithDebt.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: p.hasOverdue ? '#fffdfa' : '#ffffff' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {p.rfc || 'Sin RFC'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {p.contact || p.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
                        {p.pendingPOsCount} facturas
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: p.overdueBalance > 0 ? '#dc2626' : '#94a3b8' }}>
                      {pesosDecimals(p.overdueBalance)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {pesosDecimals(p.totalBalance)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedProviderId(p.id)}
                        style={{
                          padding: '7px 14px',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '7px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>💳</span>
                        <span>Seleccionar y Pagar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
