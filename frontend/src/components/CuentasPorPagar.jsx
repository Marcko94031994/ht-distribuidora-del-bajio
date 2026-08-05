import React, { useState, useMemo, useEffect } from 'react';
import { pesos, pesosDecimals } from '../utils/helpers';
import AntiguedadSaldosProveedores from './AntiguedadSaldosProveedores';

export default function CuentasPorPagar({ data, reloadState, initialView }) {
  // Main module sub-view: 'edo_cuenta' (Estado de Cuenta Proveedor) or 'antiguedad' (Antigüedad de Saldos Proveedores)
  const [mainView, setMainView] = useState(initialView || 'antiguedad');

  // Estado de Cuenta Sub-view state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('debt'); // 'debt', 'overdue', 'all'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'payments'

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Transferencia',
    reference: ''
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
    setSelectedProvider(provider);
    setLoadingStatement(true);
    setPaymentForm({ amount: '', method: 'Transferencia', reference: '' });
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
        setPaymentForm({ amount: '', method: 'Transferencia', reference: '' });
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

  return (
    <div className="view-container animate-fade-in" style={{ paddingBottom: '40px' }}>
      
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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            💳 Módulo de Cuentas por Pagar (CxP)
          </h2>
          <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
            Control y seguimiento de pasivos con proveedores, vencimientos y abonos
          </p>
        </div>

        {/* Sub-Views Switcher: Antigüedad de Saldos vs Estado de Cuenta */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button 
            onClick={() => setMainView('antiguedad')}
            style={{
              padding: '8px 18px',
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
            <span>📊 Antigüedad de Saldos Proveedores</span>
          </button>

          <button 
            onClick={() => setMainView('edo_cuenta')}
            style={{
              padding: '8px 18px',
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
            <span>📑 Estado de Cuenta Proveedor</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ANTIGÜEDAD DE SALDOS PROVEEDORES */}
      {mainView === 'antiguedad' && (
        <AntiguedadSaldosProveedores 
          data={data}
          onSelectProviderForStatement={handleSelectFromAntiguedad}
        />
      )}

      {/* VIEW 2: ESTADO DE CUENTA PROVEEDOR & GESTIÓN DE ABONOS */}
      {mainView === 'edo_cuenta' && (
        <div className="animate-fade-in">
          {/* Header & KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ background: '#ffffff', borderLeft: '4px solid #d81921' }}>
              <div className="card-b" style={{ padding: '18px 20px' }}>
                <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total por Pagar (Pasivo)
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#d81921', marginTop: '6px' }}>
                  {pesosDecimals(totalPayable)}
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Deuda total exigible con proveedores
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#ffffff', borderLeft: '4px solid #e11d48' }}>
              <div className="card-b" style={{ padding: '18px 20px' }}>
                <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Facturas Vencidas
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#e11d48', marginTop: '6px' }}>
                  {pesosDecimals(totalOverduePayable)}
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  {overduePOsTotalCount} {overduePOsTotalCount === 1 ? 'orden vencida' : 'órdenes vencidas'}
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#ffffff', borderLeft: '4px solid #2563eb' }}>
              <div className="card-b" style={{ padding: '18px 20px' }}>
                <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Proveedores con Deuda
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', marginTop: '6px' }}>
                  {providersWithDebtCount} <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>/ {providers.length}</span>
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Cuentas activas en cartera
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout: Table on the left, Provider Statement & Payment on the right */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(360px, 1fr)', gap: '20px', alignItems: 'start' }}>
            
            {/* Left Column: Accounts Payable Portfolio */}
            <div className="card" style={{ background: '#ffffff' }}>
              <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Cartera de Proveedores</h3>
                  <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                    Selecciona un proveedor para consultar su estado de cuenta o registrar abonos
                  </p>
                </div>

                {/* Quick Filters */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className={`btn small ${filterType === 'debt' ? 'primary' : 'secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setFilterType('debt')}
                  >
                    Con Deuda ({providersWithDebtCount})
                  </button>
                  <button 
                    className={`btn small ${filterType === 'overdue' ? 'danger' : 'secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setFilterType('overdue')}
                  >
                    Vencidos ({cxpPortfolio.filter(p => p.hasOverdue).length})
                  </button>
                  <button 
                    className={`btn small ${filterType === 'all' ? 'primary' : 'secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setFilterType('all')}
                  >
                    Todos ({providers.length})
                  </button>
                </div>
              </div>

              <div className="card-b" style={{ padding: '16px' }}>
                {/* Search Bar */}
                <div style={{ marginBottom: '16px' }}>
                  <input 
                    type="text"
                    className="input full"
                    placeholder="🔍 Buscar proveedor por nombre, RFC, contacto o teléfono..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                {/* Portfolio Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table full" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>Proveedor</th>
                        <th style={{ padding: '10px 12px' }}>Contacto / RFC</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Saldo Pendiente</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estatus</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPortfolio.map(p => {
                        const isSelected = selectedProvider?.id === p.id;
                        return (
                          <tr 
                            key={p.id} 
                            style={{ 
                              cursor: 'pointer', 
                              background: isSelected ? '#eff6ff' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                            onClick={() => fetchStatement(p)}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                              <div>{p.name}</div>
                              {p.pendingPOsCount > 0 && (
                                <span className="muted" style={{ fontSize: '11px', fontWeight: 400 }}>
                                  {p.pendingPOsCount} {p.pendingPOsCount === 1 ? 'orden pendiente' : 'órdenes pendientes'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>
                              <div>{p.contact || 'Sin contacto'}</div>
                              <div style={{ fontSize: '11px' }}>{p.rfc ? `RFC: ${p.rfc}` : p.phone || ''}</div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                              <span style={{ color: p.currentBalance > 0 ? '#d81921' : '#059669', fontSize: '14px' }}>
                                {pesosDecimals(p.currentBalance)}
                              </span>
                              {p.hasOverdue && (
                                <div style={{ fontSize: '11px', color: '#e11d48', fontWeight: 600 }}>
                                  Vencido: {pesosDecimals(p.overdueDebt)}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {p.currentBalance > 0 ? (
                                p.hasOverdue ? (
                                  <span className="chip danger" style={{ fontSize: '11px', padding: '2px 8px' }}>Vencido</span>
                                ) : (
                                  <span className="chip warn" style={{ fontSize: '11px', padding: '2px 8px' }}>Por Vencer</span>
                                )
                              ) : (
                                <span className="chip success" style={{ fontSize: '11px', padding: '2px 8px' }}>Liquidado</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button 
                                className={`btn small ${isSelected ? 'primary' : 'secondary'}`}
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchStatement(p);
                                }}
                              >
                                {isSelected ? 'Viendo' : 'Ver Detalle'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredPortfolio.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No se encontraron proveedores para los filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Provider Detail, Payment Form & Statement */}
            <div style={{ position: 'sticky', top: '16px' }}>
              {selectedProvider ? (
                <div className="card" style={{ background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  
                  {/* Provider Header Card */}
                  <div className="card-h" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 20px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: 800 }}>
                          {selectedProvider.name}
                        </h3>
                        <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                          {selectedProvider.rfc && `RFC: ${selectedProvider.rfc} · `}
                          📞 {selectedProvider.phone || 'Sin teléfono'}
                        </div>
                      </div>
                      <button 
                        className="btn secondary small" 
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => setSelectedProvider(null)}
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Saldo Pendiente</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: (selectedProvider.currentBalance || 0) > 0 ? '#d81921' : '#059669' }}>
                          {pesosDecimals(selectedProvider.currentBalance || 0)}
                        </div>
                      </div>
                      {(selectedProvider.currentBalance || 0) > 0 && (
                        <button 
                          className="btn secondary small" 
                          style={{ fontSize: '12px' }}
                          onClick={() => setPaymentForm(prev => ({ ...prev, amount: selectedProvider.currentBalance }))}
                        >
                          Liquidar Todo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Registration Box */}
                  {(selectedProvider.currentBalance || 0) > 0 && (
                    <div style={{ padding: '16px 20px', background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💵 Registrar Abono / Pago a Proveedor</span>
                      </div>

                      <form onSubmit={handleRegisterPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label className="muted" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                              Monto a Abonar *
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
                              style={{ fontSize: '14px', fontWeight: 600 }}
                            />
                          </div>

                          <div>
                            <label className="muted" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                              Método de Pago *
                            </label>
                            <select 
                              className="select full"
                              value={paymentForm.method}
                              onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                              style={{ fontSize: '13px' }}
                            >
                              <option value="Transferencia">Transferencia (SPEI)</option>
                              <option value="Efectivo">Efectivo</option>
                              <option value="Cheque">Cheque</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="muted" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                            Referencia Bancaria / Folio de Transferencia
                          </label>
                          <input 
                            type="text"
                            placeholder="Ej. SPEI-98234 o Cheque #4012"
                            className="input full"
                            value={paymentForm.reference}
                            onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                            style={{ fontSize: '13px' }}
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="btn success full"
                          disabled={paying}
                          style={{ padding: '8px', fontSize: '13px', fontWeight: 700, marginTop: '4px' }}
                        >
                          {paying ? 'Procesando Abono...' : '✅ Aplicar Pago a Proveedor'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Statement Tabs: Facturas/OCs vs Pagos */}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
                      <button 
                        onClick={() => setActiveTab('pos')}
                        style={{
                          padding: '8px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: activeTab === 'pos' ? '2px solid #d81921' : 'none',
                          color: activeTab === 'pos' ? '#d81921' : '#64748b',
                          fontWeight: activeTab === 'pos' ? 700 : 500,
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        📦 Órdenes de Compra ({statement?.purchaseOrders?.length || 0})
                      </button>
                      <button 
                        onClick={() => setActiveTab('payments')}
                        style={{
                          padding: '8px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: activeTab === 'payments' ? '2px solid #d81921' : 'none',
                          color: activeTab === 'payments' ? '#d81921' : '#64748b',
                          fontWeight: activeTab === 'payments' ? 700 : 500,
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        💰 Historial de Abonos ({statement?.payments?.length || 0})
                      </button>
                    </div>

                    {loadingStatement ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        Cargando movimientos del proveedor...
                      </div>
                    ) : activeTab === 'pos' ? (
                      /* Purchase Orders List */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                        {(statement?.purchaseOrders || []).map(po => {
                          const balance = (po.totalAmount || 0) - (po.amountPaid || 0);
                          const isPending = balance > 0;
                          return (
                            <div 
                              key={po.id || po.poNumber} 
                              style={{
                                padding: '10px 12px',
                                background: isPending ? '#ffffff' : '#f8fafc',
                                border: `1px solid ${isPending ? '#e2e8f0' : '#f1f5f9'}`,
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                                  📄 {po.poNumber} 
                                  {po.reference1 && <span className="muted" style={{ fontWeight: 400, marginLeft: '6px' }}>(Fact: {po.reference1})</span>}
                                </div>
                                <div className="muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                                  Fecha: {po.date ? po.date.split('T')[0] : 'N/D'} 
                                  {po.dueDate && ` · Vence: ${po.dueDate.split('T')[0]}`}
                                </div>
                                {po.isOverdue && (
                                  <span className="chip danger" style={{ fontSize: '10px', padding: '1px 6px', marginTop: '4px' }}>
                                    Vencida {po.daysOverdue > 0 ? `hace ${po.daysOverdue} días` : ''}
                                  </span>
                                )}
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: isPending ? '#d81921' : '#64748b' }}>
                                  {isPending ? `Saldo: ${pesosDecimals(balance)}` : 'Liquidada'}
                                </div>
                                <div className="muted" style={{ fontSize: '11px' }}>
                                  Total: {pesosDecimals(po.totalAmount || 0)}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {(!statement?.purchaseOrders || statement.purchaseOrders.length === 0) && (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                            No hay órdenes de compra registradas con este proveedor.
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Payments History */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                        {(statement?.payments || []).map(p => (
                          <div 
                            key={p.id}
                            style={{
                              padding: '10px 12px',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#065f46' }}>
                                💰 Abono {p.paymentMethod || 'Transferencia'}
                              </div>
                              <div className="muted" style={{ fontSize: '11px', marginTop: '2px', color: '#047857' }}>
                                {p.date ? p.date.split('T')[0] : 'N/D'}
                                {p.reference && ` · Ref: ${p.reference}`}
                              </div>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                              -{pesosDecimals(p.amount)}
                            </div>
                          </div>
                        ))}

                        {(!statement?.payments || statement.payments.length === 0) && (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                            No hay abonos registrados para este proveedor.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="card" style={{ background: '#ffffff', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🧾</div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '15px' }}>Selecciona un Proveedor</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    Haz clic en cualquier proveedor de la lista para ver su estado de cuenta desglosado, facturas vencidas y registrar abonos.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
