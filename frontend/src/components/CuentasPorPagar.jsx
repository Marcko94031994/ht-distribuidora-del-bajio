import React, { useState, useMemo, useEffect } from 'react';
import { pesos, pesosDecimals } from '../utils/helpers';
import AntiguedadSaldosProveedores from './AntiguedadSaldosProveedores';
import PagoAProveedores from './PagoAProveedores';

export default function CuentasPorPagar({ data, reloadState, initialView }) {
  // Main module sub-view: 'antiguedad', 'pagos', or 'edo_cuenta'
  const [mainView, setMainView] = useState(initialView || 'antiguedad');

  useEffect(() => {
    if (initialView) {
      setMainView(initialView);
    }
  }, [initialView]);

  // Estado de Cuenta Sub-view state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('debt'); // 'debt', 'overdue', 'all'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'payments'

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Transferencia',
    reference: '',
    notes: ''
  });

  // Providers list
  const providers = useMemo(() => {
    return data.proveedores || [];
  }, [data.proveedores]);

  // Purchase Orders list
  const purchaseOrders = useMemo(() => {
    return data.ordenesCompra || [];
  }, [data.ordenesCompra]);

  // Calculate detailed CxP data per provider
  const cxpPortfolio = useMemo(() => {
    const now = new Date();

    return providers.map(p => {
      // Find all POs for this provider that have pending balance
      const pPOs = purchaseOrders.filter(po => 
        po.providerId === p.id && 
        po.status !== 'Cancelada' && 
        (po.amountPaid || 0) < (po.totalAmount || 0)
      );

      const overduePOs = pPOs.filter(po => {
        if (!po.dueDate) return false;
        return new Date(po.dueDate) < now;
      });

      const totalDebt = p.currentBalance || 0;
      const overdueDebt = overduePOs.reduce((acc, po) => acc + ((po.totalAmount || 0) - (po.amountPaid || 0)), 0);

      return {
        ...p,
        currentBalance: totalDebt,
        pendingPOsCount: pPOs.length,
        overduePOsCount: overduePOs.length,
        overdueDebt,
        hasOverdue: overduePOs.length > 0
      };
    });
  }, [providers, purchaseOrders]);

  // Filtered portfolio
  const filteredPortfolio = useMemo(() => {
    return cxpPortfolio.filter(p => {
      const term = search.toLowerCase();
      const matchSearch = (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.rfc && p.rfc.toLowerCase().includes(term)) ||
        (p.contact && p.contact.toLowerCase().includes(term)) ||
        (p.phone && p.phone.toLowerCase().includes(term))
      );

      if (!matchSearch) return false;

      if (filterType === 'debt') return (p.currentBalance || 0) > 0;
      if (filterType === 'overdue') return p.hasOverdue && (p.currentBalance || 0) > 0;
      return true; // 'all'
    }).sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0));
  }, [cxpPortfolio, search, filterType]);

  // Global KPIs
  const totalPayable = useMemo(() => {
    return cxpPortfolio.reduce((acc, p) => acc + (p.currentBalance || 0), 0);
  }, [cxpPortfolio]);

  const totalOverduePayable = useMemo(() => {
    return cxpPortfolio.reduce((acc, p) => acc + (p.overdueDebt || 0), 0);
  }, [cxpPortfolio]);

  const providersWithDebtCount = useMemo(() => {
    return cxpPortfolio.filter(p => (p.currentBalance || 0) > 0).length;
  }, [cxpPortfolio]);

  const overduePOsTotalCount = useMemo(() => {
    return cxpPortfolio.reduce((acc, p) => acc + (p.overduePOsCount || 0), 0);
  }, [cxpPortfolio]);

  // Fetch statement for selected provider
  const fetchStatement = async (provider) => {
    if (!provider) {
      setSelectedProvider(null);
      setStatement(null);
      return;
    }
    setSelectedProvider(provider);
    setLoadingStatement(true);
    setPaymentForm({ amount: '', method: 'Transferencia', reference: '', notes: '' });
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/provider/${provider.id || provider.providerId}/statement`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStatement(json);
      } else {
        // Fallback: build from local state
        const localPOs = purchaseOrders.filter(po => po.providerId === (provider.id || provider.providerId));
        setStatement({
          provider,
          purchaseOrders: localPOs,
          payments: []
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Jump from Antiguedad to Estado de Cuenta
  const handleSelectFromAntiguedad = (providerRow) => {
    const p = providers.find(item => item.id === (providerRow.providerId || providerRow.id)) || providerRow;
    fetchStatement(p);
    setMainView('edo_cuenta');
  };

  // Keep statement in sync when data changes
  useEffect(() => {
    if (selectedProvider) {
      const updated = cxpPortfolio.find(p => p.id === selectedProvider.id);
      if (updated) setSelectedProvider(updated);
    }
  }, [cxpPortfolio]);

  // Calculate totals from statement POs
  const statementSummary = useMemo(() => {
    if (!statement || !statement.purchaseOrders) {
      return { totalInvoiced: 0, totalPaid: 0, totalPending: selectedProvider?.currentBalance || 0, overdueCount: 0, overdueAmount: 0 };
    }
    const pos = statement.purchaseOrders;
    const totalInvoiced = pos.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
    const totalPaid = pos.reduce((sum, po) => sum + (Number(po.amountPaid) || 0), 0);
    const totalPending = pos.reduce((sum, po) => sum + ((Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0)), 0);
    const overduePOs = pos.filter(po => po.isOverdue || (po.dueDate && new Date(po.dueDate) < new Date() && (po.amountPaid < po.totalAmount)));
    const overdueAmount = overduePOs.reduce((sum, po) => sum + ((Number(po.totalAmount) || 0) - (Number(po.amountPaid) || 0)), 0);

    return {
      totalInvoiced,
      totalPaid,
      totalPending: selectedProvider?.currentBalance || totalPending,
      overdueCount: overduePOs.length,
      overdueAmount
    };
  }, [statement, selectedProvider]);

  // Handle payment submission
  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert('Por favor ingrese un monto de abono válido mayor a $0.');
      return;
    }

    if (amount > (selectedProvider.currentBalance || 0)) {
      if (!window.confirm(`El monto ingresado ($${amount}) supera el saldo pendiente ($${selectedProvider.currentBalance}). ¿Desea continuar?`)) {
        return;
      }
    }

    setPaying(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/provider-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          amount,
          paymentMethod: paymentForm.method,
          reference: paymentForm.reference || ''
        })
      });

      if (res.ok) {
        alert(`✅ Abono de ${pesosDecimals(amount)} registrado exitosamente a ${selectedProvider.name}.`);
        setPaymentForm({ amount: '', method: 'Transferencia', reference: '', notes: '' });
        setShowPaymentForm(false);
        if (reloadState) await reloadState();
        fetchStatement(selectedProvider);
      } else {
        const err = await res.text();
        alert('Error al registrar el pago: ' + err);
      }
    } catch (err) {
      alert('Error de comunicación: ' + err.message);
    } finally {
      setPaying(false);
    }
  };

  // Helper to pre-fill payment for a specific invoice
  const handlePaySpecificPO = (po) => {
    const balance = (po.totalAmount || 0) - (po.amountPaid || 0);
    setPaymentForm({
      amount: balance > 0 ? balance : '',
      method: 'Transferencia',
      reference: po.reference1 ? `Pago Factura ${po.reference1} (${po.poNumber})` : `Pago ${po.poNumber}`,
      notes: `Liquidación factura ${po.reference1 || po.poNumber}`
    });
    setShowPaymentForm(true);
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  return (
    <div className="view-container animate-fade-in" style={{ paddingBottom: '50px', width: '100%', maxWidth: '100%' }}>
      
      {/* Module Title & Main Sub-Views Switcher */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          padding: '16px 24px', 
          marginBottom: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💳</span> Módulo de Cuentas por Pagar (CxP)
          </h2>
          <p className="muted" style={{ margin: '3px 0 0 0', fontSize: '13px' }}>
            Control exhaustivo de facturas de compras, pasivos con proveedores, vencimientos y abonos
          </p>
        </div>

        {/* Sub-Views Switcher: Antigüedad de Saldos vs Pago a Proveedores vs Estado de Cuenta */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setMainView('antiguedad')}
            style={{
              padding: '9px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: mainView === 'antiguedad' ? '#ffffff' : 'transparent',
              color: mainView === 'antiguedad' ? '#0f172a' : '#64748b',
              boxShadow: mainView === 'antiguedad' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📊 Antigüedad de Saldos</span>
          </button>

          <button 
            onClick={() => setMainView('pagos')}
            style={{
              padding: '9px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: mainView === 'pagos' ? '#16a34a' : 'transparent',
              color: mainView === 'pagos' ? '#ffffff' : '#64748b',
              boxShadow: mainView === 'pagos' ? '0 2px 6px rgba(22,163,74,0.3)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💳 Pago a Proveedores</span>
          </button>

          <button 
            onClick={() => setMainView('edo_cuenta')}
            style={{
              padding: '9px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: mainView === 'edo_cuenta' ? '#ffffff' : 'transparent',
              color: mainView === 'edo_cuenta' ? '#0f172a' : '#64748b',
              boxShadow: mainView === 'edo_cuenta' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📑 Cartera y Estado de Cuenta</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ANTIGÜEDAD DE SALDOS PROVEEDORES */}
      {mainView === 'antiguedad' && (
        <AntiguedadSaldosProveedores 
          data={data}
          onSelectProviderForStatement={(p) => {
            setSelectedProvider(p);
            setMainView('pagos');
          }}
        />
      )}

      {/* VIEW 2: NUEVO MÓDULO PAGO A PROVEEDORES */}
      {mainView === 'pagos' && (
        <PagoAProveedores
          data={data}
          reloadState={reloadState}
          preSelectedProviderId={selectedProvider?.id || selectedProvider?.providerId}
          onSelectProviderForStatement={handleSelectFromAntiguedad}
        />
      )}

      {/* VIEW 3: ESTADO DE CUENTA PROVEEDOR & GESTIÓN DE FACTURAS (FULL WIDTH) */}
      {mainView === 'edo_cuenta' && (
        <div className="animate-fade-in" style={{ width: '100%' }}>
          
          {/* Header & KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ background: '#ffffff', borderLeft: '5px solid #d81921', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
              <div className="card-b" style={{ padding: '18px 22px' }}>
                <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
                  Total por Pagar (Pasivo Global)
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#d81921', marginTop: '6px' }}>
                  {pesosDecimals(totalPayable)}
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Deuda total exigible con todos los proveedores
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#ffffff', borderLeft: '5px solid #e11d48', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
              <div className="card-b" style={{ padding: '18px 22px' }}>
                <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
                  Facturas Vencidas
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#e11d48', marginTop: '6px' }}>
                  {pesosDecimals(totalOverduePayable)}
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  {overduePOsTotalCount} {overduePOsTotalCount === 1 ? 'orden vencida' : 'órdenes vencidas en cartera'}
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#ffffff', borderLeft: '5px solid #2563eb', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
              <div className="card-b" style={{ padding: '18px 22px' }}>
                <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
                  Proveedores con Deuda
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginTop: '6px' }}>
                  {providersWithDebtCount} <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>/ {providers.length} en total</span>
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Cuentas activas con saldo por pagar
                </div>
              </div>
            </div>
          </div>

          {/* Top Provider Selector Bar */}
          <div 
            className="card" 
            style={{ 
              background: '#ffffff', 
              padding: '16px 20px', 
              borderRadius: '12px', 
              marginBottom: '20px', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 350px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                  🏢 Seleccionar Proveedor:
                </span>
                <select 
                  className="select" 
                  style={{ flex: 1, fontSize: '14px', fontWeight: 600, padding: '8px 12px', borderRadius: '8px', borderColor: '#cbd5e1' }}
                  value={selectedProvider?.id || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const p = providers.find(item => item.id === id);
                    fetchStatement(p || null);
                  }}
                >
                  <option value="">-- Ver listado general de cartera / Seleccionar proveedor --</option>
                  {providers.map(p => {
                    const debt = p.currentBalance || 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {debt > 0 ? `(Saldo: $${pesos(debt)})` : '(Sin saldo)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedProvider && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    Viendo: <strong style={{ color: '#0f172a' }}>{selectedProvider.name}</strong>
                  </span>
                  <button 
                    className="btn secondary small" 
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                    onClick={() => {
                      setSelectedProvider(null);
                      setStatement(null);
                    }}
                  >
                    ✕ Ver Todos los Proveedores
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SCENARIO A: A SPECIFIC PROVIDER IS SELECTED -> FULL WIDTH VIEW            */}
          {/* ========================================================================= */}
          {selectedProvider ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              
              {/* Full-Width Provider Master Banner */}
              <div 
                className="card" 
                style={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '14px', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                  padding: '24px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                        🏢 {selectedProvider.name}
                      </h2>
                      {(selectedProvider.currentBalance || 0) > 0 ? (
                        selectedProvider.hasOverdue ? (
                          <span className="chip danger" style={{ fontSize: '12px', padding: '3px 10px', fontWeight: 700 }}>
                            ⚠️ Facturas Vencidas
                          </span>
                        ) : (
                          <span className="chip warn" style={{ fontSize: '12px', padding: '3px 10px', fontWeight: 700 }}>
                            Por Vencer
                          </span>
                        )
                      ) : (
                        <span className="chip success" style={{ fontSize: '12px', padding: '3px 10px', fontWeight: 700 }}>
                          ✅ Al Corriente
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#475569' }}>
                      {selectedProvider.rfc && <div><strong>RFC:</strong> {selectedProvider.rfc}</div>}
                      {selectedProvider.contact && <div><strong>Contacto:</strong> {selectedProvider.contact}</div>}
                      <div><strong>📞 Teléfono:</strong> {selectedProvider.phone || 'No registrado'}</div>
                      {selectedProvider.address && <div><strong>📍 Dirección:</strong> {selectedProvider.address}</div>}
                      {selectedProvider.creditDays > 0 && (
                        <div><strong>⏳ Días de Crédito:</strong> {selectedProvider.creditDays} días</div>
                      )}
                    </div>
                  </div>

                  {/* Actions Header Bar */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(selectedProvider.currentBalance || 0) > 0 && (
                      <>
                        <button 
                          className="btn primary"
                          style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => {
                            setShowPaymentForm(true);
                            setPaymentForm(prev => ({ ...prev, amount: '' }));
                          }}
                        >
                          <span>💵</span> Registrar Abono
                        </button>
                        <button 
                          className="btn success"
                          style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => {
                            setShowPaymentForm(true);
                            setPaymentForm(prev => ({ 
                              ...prev, 
                              amount: selectedProvider.currentBalance,
                              reference: `Liquidación Total ${selectedProvider.name}`,
                              notes: 'Liquidación total de saldo pendiente en cartera'
                            }));
                          }}
                        >
                          <span>⚡</span> Liquidar Todo ({pesos(selectedProvider.currentBalance)})
                        </button>
                      </>
                    )}
                    <button 
                      className="btn secondary"
                      style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '8px' }}
                      onClick={() => fetchStatement(selectedProvider)}
                      title="Recargar información"
                    >
                      🔄 Actualizar
                    </button>
                  </div>
                </div>

                {/* 4 Big Metrics for Selected Provider */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
                  <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Saldo Pendiente Total
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: (selectedProvider.currentBalance || 0) > 0 ? '#d81921' : '#059669', marginTop: '4px' }}>
                      {pesosDecimals(selectedProvider.currentBalance || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Saldo actual a liquidar
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #ffedd5', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Saldo Vencido
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: statementSummary.overdueAmount > 0 ? '#ea580c' : '#10b981', marginTop: '4px' }}>
                      {pesosDecimals(statementSummary.overdueAmount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {statementSummary.overdueCount} {statementSummary.overdueCount === 1 ? 'factura vencida' : 'facturas vencidas'}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Facturado (Histórico)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
                      {pesosDecimals(statementSummary.totalInvoiced)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {statement?.purchaseOrders?.length || 0} órdenes de compra / facturas
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #d1fae5', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Pagado / Abonado
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                      {pesosDecimals(statementSummary.totalPaid)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {statement?.payments?.length || 0} abonos registrados
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-Width Payment Registration Form (Expandable / Inline) */}
              {showPaymentForm && (
                <div 
                  className="card animate-fade-in" 
                  style={{ 
                    background: '#fffbeb', 
                    border: '2px solid #fde68a', 
                    borderRadius: '12px', 
                    padding: '20px 24px',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>💵</span>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#92400e' }}>
                        Registrar Abono o Liquidación a {selectedProvider.name}
                      </h3>
                    </div>
                    <button 
                      className="btn secondary small" 
                      onClick={() => setShowPaymentForm(false)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      ✕ Ocultar Formulario
                    </button>
                  </div>

                  <form onSubmit={handleRegisterPayment}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div>
                        <label className="muted" style={{ fontSize: '12px', fontWeight: 700, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                          Monto a Abonar (MXN) *
                        </label>
                        <input 
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="$0.00"
                          className="input full"
                          value={paymentForm.amount}
                          onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          required
                          style={{ fontSize: '16px', fontWeight: 800, borderColor: '#fcd34d' }}
                        />
                      </div>

                      <div>
                        <label className="muted" style={{ fontSize: '12px', fontWeight: 700, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                          Método de Pago *
                        </label>
                        <select 
                          className="select full"
                          value={paymentForm.method}
                          onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                          style={{ fontSize: '14px', fontWeight: 600, borderColor: '#fcd34d' }}
                        >
                          <option value="Transferencia">Transferencia Electrónica (SPEI)</option>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Cheque">Cheque Nominativo</option>
                          <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                        </select>
                      </div>

                      <div>
                        <label className="muted" style={{ fontSize: '12px', fontWeight: 700, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                          Referencia / Folio Bancario
                        </label>
                        <input 
                          type="text"
                          placeholder="Ej. SPEI-98402 o Cheque #4012"
                          className="input full"
                          value={paymentForm.reference}
                          onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                          style={{ fontSize: '14px', borderColor: '#fcd34d' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button 
                          type="submit" 
                          className="btn success full"
                          disabled={paying}
                          style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 800, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          {paying ? '⏳ Procesando Abono...' : '✅ Aplicar Pago y Actualizar Saldo'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Full-Width Movement View with Tabs */}
              <div 
                className="card" 
                style={{ 
                  background: '#ffffff', 
                  borderRadius: '14px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  overflow: 'hidden'
                }}
              >
                {/* Navigation Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px' }}>
                  <button 
                    onClick={() => setActiveTab('pos')}
                    style={{
                      padding: '14px 22px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'pos' ? '3px solid #d81921' : '3px solid transparent',
                      color: activeTab === 'pos' ? '#d81921' : '#64748b',
                      fontWeight: activeTab === 'pos' ? 800 : 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📄 Facturas y Órdenes de Compra</span>
                    <span 
                      style={{ 
                        background: activeTab === 'pos' ? '#fee2e2' : '#e2e8f0', 
                        color: activeTab === 'pos' ? '#991b1b' : '#475569',
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px' 
                      }}
                    >
                      {statement?.purchaseOrders?.length || 0}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('payments')}
                    style={{
                      padding: '14px 22px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'payments' ? '3px solid #059669' : '3px solid transparent',
                      color: activeTab === 'payments' ? '#059669' : '#64748b',
                      fontWeight: activeTab === 'payments' ? 800 : 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>💰 Historial de Abonos y Pagos</span>
                    <span 
                      style={{ 
                        background: activeTab === 'payments' ? '#d1fae5' : '#e2e8f0', 
                        color: activeTab === 'payments' ? '#065f46' : '#475569',
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px' 
                      }}
                    >
                      {statement?.payments?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Content Area */}
                <div style={{ padding: '20px' }}>
                  {loadingStatement ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '15px' }}>
                      ⏳ Cargando facturas y movimientos del proveedor...
                    </div>
                  ) : activeTab === 'pos' ? (
                    
                    /* ================================================================= */
                    /* TAB 1: FULL-WIDTH INVOICES & PURCHASE ORDERS TABLE                */
                    /* ================================================================= */
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table full" style={{ fontSize: '13px', width: '100%', minWidth: '850px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 14px' }}>Folio OC</th>
                            <th style={{ padding: '12px 14px' }}>Factura Proveedor / Ref</th>
                            <th style={{ padding: '12px 14px' }}>Fecha Emisión</th>
                            <th style={{ padding: '12px 14px' }}>Vencimiento</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Importe Total</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Abonado</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Pendiente</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center' }}>Estatus</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(statement?.purchaseOrders || []).map(po => {
                            const balance = (po.totalAmount || 0) - (po.amountPaid || 0);
                            const isPending = balance > 0;
                            const isOverdue = po.isOverdue || (po.dueDate && new Date(po.dueDate) < new Date() && isPending);
                            const daysDiff = po.dueDate ? Math.ceil((new Date(po.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

                            return (
                              <tr 
                                key={po.id || po.poNumber}
                                style={{ 
                                  background: isOverdue ? '#fff1f2' : (isPending ? '#ffffff' : '#f8fafc'),
                                  borderBottom: '1px solid #f1f5f9',
                                  transition: 'background 0.15s ease'
                                }}
                              >
                                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>📄</span>
                                    <span>{po.poNumber}</span>
                                  </div>
                                </td>

                                <td style={{ padding: '12px 14px' }}>
                                  {po.reference1 ? (
                                    <span style={{ fontWeight: 600, color: '#1e293b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                                      {po.reference1}
                                    </span>
                                  ) : (
                                    <span className="muted">Sin factura / N/D</span>
                                  )}
                                  {po.reference2 && (
                                    <div className="muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                                      Ref 2: {po.reference2}
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: '12px 14px', color: '#475569' }}>
                                  {po.date ? po.date.split('T')[0] : 'N/D'}
                                </td>

                                <td style={{ padding: '12px 14px' }}>
                                  <div>{po.dueDate ? po.dueDate.split('T')[0] : 'Sin fecha'}</div>
                                  {isPending && po.dueDate && (
                                    isOverdue ? (
                                      <span className="chip danger" style={{ fontSize: '11px', padding: '1px 6px', marginTop: '3px', display: 'inline-block' }}>
                                        ⚠️ Vencida {Math.abs(daysDiff)} días
                                      </span>
                                    ) : (
                                      <span className="chip warn" style={{ fontSize: '11px', padding: '1px 6px', marginTop: '3px', display: 'inline-block' }}>
                                        Vence en {daysDiff} días
                                      </span>
                                    )
                                  )}
                                </td>

                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                                  {pesosDecimals(po.totalAmount || 0)}
                                </td>

                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                  {pesosDecimals(po.amountPaid || 0)}
                                </td>

                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800 }}>
                                  <span style={{ fontSize: '15px', color: isPending ? (isOverdue ? '#e11d48' : '#d81921') : '#059669' }}>
                                    {pesosDecimals(balance)}
                                  </span>
                                </td>

                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                  {!isPending ? (
                                    <span className="chip success" style={{ fontSize: '11px', padding: '3px 8px' }}>Liquidada</span>
                                  ) : (po.amountPaid || 0) > 0 ? (
                                    <span className="chip warn" style={{ fontSize: '11px', padding: '3px 8px' }}>Abono Parcial</span>
                                  ) : isOverdue ? (
                                    <span className="chip danger" style={{ fontSize: '11px', padding: '3px 8px' }}>Vencida</span>
                                  ) : (
                                    <span className="chip" style={{ fontSize: '11px', padding: '3px 8px', background: '#f1f5f9', color: '#334155' }}>Pendiente</span>
                                  )}
                                </td>

                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                  {isPending ? (
                                    <button 
                                      className="btn success small"
                                      style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '6px' }}
                                      onClick={() => handlePaySpecificPO(po)}
                                    >
                                      💵 Liquidar OC
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                                      ✓ Pagada
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {(!statement?.purchaseOrders || statement.purchaseOrders.length === 0) && (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                No se encontraron órdenes de compra o facturas registradas para este proveedor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        
                        {/* Table Footer with Summary */}
                        {statement?.purchaseOrders && statement.purchaseOrders.length > 0 && (
                          <tfoot>
                            <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                              <td colSpan={4} style={{ padding: '14px', textAlign: 'right', textTransform: 'uppercase', fontSize: '12px', color: '#475569' }}>
                                TOTALES DE LA CUENTA:
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right', fontSize: '15px', color: '#1e293b' }}>
                                {pesosDecimals(statementSummary.totalInvoiced)}
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right', fontSize: '15px', color: '#059669' }}>
                                {pesosDecimals(statementSummary.totalPaid)}
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right', fontSize: '16px', color: '#d81921' }}>
                                {pesosDecimals(statementSummary.totalPending)}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  ) : (
                    
                    /* ================================================================= */
                    /* TAB 2: FULL-WIDTH PAYMENTS / ABONOS HISTORY TABLE                 */
                    /* ================================================================= */
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table full" style={{ fontSize: '13px', width: '100%' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 14px' }}>Folio / ID</th>
                            <th style={{ padding: '12px 14px' }}>Fecha y Hora</th>
                            <th style={{ padding: '12px 14px' }}>Método de Pago</th>
                            <th style={{ padding: '12px 14px' }}>Referencia / Folio Bancario</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Monto Abonado</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center' }}>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(statement?.payments || []).map((p, idx) => (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                                💰 AB-{p.id || (idx + 1)}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#475569' }}>
                                {p.date ? p.date.replace('T', ' ').substring(0, 16) : 'N/D'}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>
                                  {p.paymentMethod || 'Transferencia'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#1e293b' }}>
                                {p.reference || <span className="muted">Sin referencia</span>}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: '15px', color: '#059669' }}>
                                -{pesosDecimals(p.amount)}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span className="chip success" style={{ fontSize: '11px', padding: '3px 8px' }}>
                                  ✅ Aplicado en Cartera
                                </span>
                              </td>
                            </tr>
                          ))}

                          {(!statement?.payments || statement.payments.length === 0) && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                No se tienen abonos o pagos registrados para este proveedor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {statement?.payments && statement.payments.length > 0 && (
                          <tfoot>
                            <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                              <td colSpan={4} style={{ padding: '14px', textAlign: 'right', textTransform: 'uppercase', fontSize: '12px', color: '#475569' }}>
                                TOTAL HISTÓRICO DE ABONOS:
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right', fontSize: '16px', color: '#059669' }}>
                                -{pesosDecimals(statement.payments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0))}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            
            /* ========================================================================= */
            /* SCENARIO B: NO PROVIDER SELECTED -> FULL WIDTH CARTERA DE PROVEEDORES     */
            /* ========================================================================= */
            <div 
              className="card animate-fade-in" 
              style={{ 
                background: '#ffffff', 
                borderRadius: '14px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                padding: '24px',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    📋 Cartera General de Proveedores
                  </h3>
                  <p className="muted" style={{ margin: '3px 0 0 0', fontSize: '13px' }}>
                    Selecciona cualquier proveedor para expandir en pantalla completa su estado de cuenta, facturas pendientes y registrar pagos
                  </p>
                </div>

                {/* Filter Chips */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`btn ${filterType === 'debt' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}
                    onClick={() => setFilterType('debt')}
                  >
                    Con Deuda ({providersWithDebtCount})
                  </button>
                  <button 
                    className={`btn ${filterType === 'overdue' ? 'danger' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}
                    onClick={() => setFilterType('overdue')}
                  >
                    Vencidos ({cxpPortfolio.filter(p => p.hasOverdue).length})
                  </button>
                  <button 
                    className={`btn ${filterType === 'all' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}
                    onClick={() => setFilterType('all')}
                  >
                    Todos ({providers.length})
                  </button>
                </div>
              </div>

              {/* Full Width Search Input */}
              <div style={{ marginBottom: '20px' }}>
                <input 
                  type="text"
                  className="input full"
                  placeholder="🔍 Buscar proveedor por nombre, RFC, contacto o teléfono..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ borderRadius: '10px', fontSize: '14px', padding: '12px 16px', borderColor: '#cbd5e1' }}
                />
              </div>

              {/* Full Width Provider Portfolio Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table full" style={{ fontSize: '13px', width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px' }}>Proveedor / Razón Social</th>
                      <th style={{ padding: '12px 14px' }}>Contacto / RFC / Teléfono</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Órdenes Pendientes</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Vencido</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo Pendiente Total</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Estatus</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPortfolio.map(p => (
                      <tr 
                        key={p.id} 
                        style={{ 
                          cursor: 'pointer', 
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease'
                        }}
                        onClick={() => fetchStatement(p)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <td style={{ padding: '14px', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🏢</span>
                            <span>{p.name}</span>
                          </div>
                        </td>

                        <td style={{ padding: '14px', color: '#475569' }}>
                          <div>{p.contact || 'Sin contacto'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {p.rfc ? `RFC: ${p.rfc}` : ''} {p.phone ? `· 📞 ${p.phone}` : ''}
                          </div>
                        </td>

                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          {p.pendingPOsCount > 0 ? (
                            <span className="chip" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '12px', padding: '2px 8px' }}>
                              {p.pendingPOsCount} {p.pendingPOsCount === 1 ? 'orden' : 'órdenes'}
                            </span>
                          ) : (
                            <span className="chip" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '12px', padding: '2px 8px' }}>
                              0 órdenes
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: p.overdueDebt > 0 ? '#e11d48' : '#64748b' }}>
                          {p.overdueDebt > 0 ? pesosDecimals(p.overdueDebt) : '$0.00'}
                        </td>

                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800 }}>
                          <span style={{ color: p.currentBalance > 0 ? '#d81921' : '#059669', fontSize: '16px' }}>
                            {pesosDecimals(p.currentBalance)}
                          </span>
                        </td>

                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          {p.currentBalance > 0 ? (
                            p.hasOverdue ? (
                              <span className="chip danger" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>Vencido</span>
                            ) : (
                              <span className="chip warn" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>Por Vencer</span>
                            )
                          ) : (
                            <span className="chip success" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>Al Corriente</span>
                          )}
                        </td>

                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <button 
                            className="btn primary small"
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '6px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchStatement(p);
                            }}
                          >
                            👁️ Ver Facturas y Detalle
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredPortfolio.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                          No se encontraron proveedores que coincidan con la búsqueda o filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
