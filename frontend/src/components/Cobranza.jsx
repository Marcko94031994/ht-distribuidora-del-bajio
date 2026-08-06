import React, { useState, useMemo, useEffect } from 'react';
import { pesos, pesosDecimals } from '../utils/helpers';
import AntiguedadSaldosClientes from './AntiguedadSaldosClientes';

export default function Cobranza({ data, reloadState, initialView }) {
  // Main module sub-view: 'antiguedad' (Antigüedad de Saldos Clientes) or 'edo_cuenta' (Estado de Cuenta & Cobranza)
  const [mainView, setMainView] = useState(initialView || 'antiguedad');

  // Estado de Cuenta Sub-view state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('debt'); // 'debt', 'overdue', 'all'
  const [selectedClient, setSelectedClient] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'payments'

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Transferencia',
    reference: ''
  });

  // Clients list
  const clients = useMemo(() => {
    return data.clientes && data.clientes.length > 0 
      ? data.clientes 
      : (data.rutas || []).flatMap(r => r.clients || []);
  }, [data.clientes, data.rutas]);

  // Orders list
  const orders = useMemo(() => {
    return data.pedidos || [];
  }, [data.pedidos]);

  // Calculate detailed CxC portfolio data per client
  const cxcPortfolio = useMemo(() => {
    const now = new Date();

    return clients.map(c => {
      // Find all credit orders for this client that have pending balance
      const cOrders = orders.filter(ord => 
        ord.clientId === c.id && 
        ord.status !== 'Cancelada' && 
        (ord.paymentMethod === 'Crédito' || (ord.amountPaid || 0) < (ord.totalAmount || 0)) &&
        (ord.amountPaid || 0) < (ord.totalAmount || 0)
      );

      const overdueOrders = cOrders.filter(ord => {
        let due = ord.dueDate ? new Date(ord.dueDate) : null;
        if (!due && ord.date) {
          const days = c.creditDays > 0 ? c.creditDays : 30;
          due = new Date(new Date(ord.date).getTime() + days * 24 * 60 * 60 * 1000);
        }
        return due && due < now;
      });

      const totalDebt = c.currentBalance || 0;
      const overdueDebt = overdueOrders.reduce((acc, ord) => acc + ((ord.totalAmount || 0) - (ord.amountPaid || 0)), 0);

      return {
        ...c,
        currentBalance: totalDebt,
        pendingOrdersCount: cOrders.length,
        overdueOrdersCount: overdueOrders.length,
        overdueDebt,
        hasOverdue: overdueOrders.length > 0 || c.hasOverdueDebt
      };
    });
  }, [clients, orders]);

  // Filtered portfolio
  const filteredPortfolio = useMemo(() => {
    return cxcPortfolio.filter(c => {
      const term = search.toLowerCase();
      const matchSearch = (
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.rfc && c.rfc.toLowerCase().includes(term)) ||
        (c.zone && c.zone.toLowerCase().includes(term)) ||
        (c.razonSocial && c.razonSocial.toLowerCase().includes(term)) ||
        (c.telefonos && c.telefonos.toLowerCase().includes(term))
      );

      if (!matchSearch) return false;

      if (filterType === 'debt') return (c.currentBalance || 0) > 0;
      if (filterType === 'overdue') return c.hasOverdue && (c.currentBalance || 0) > 0;
      return true; // 'all'
    }).sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0));
  }, [cxcPortfolio, search, filterType]);

  // Global KPIs
  const totalReceivable = useMemo(() => {
    return cxcPortfolio.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
  }, [cxcPortfolio]);

  const totalOverdueReceivable = useMemo(() => {
    return cxcPortfolio.reduce((acc, c) => acc + (c.overdueDebt || 0), 0);
  }, [cxcPortfolio]);

  const clientsWithDebtCount = useMemo(() => {
    return cxcPortfolio.filter(c => (c.currentBalance || 0) > 0).length;
  }, [cxcPortfolio]);

  const overdueOrdersTotalCount = useMemo(() => {
    return cxcPortfolio.reduce((acc, c) => acc + (c.overdueOrdersCount || 0), 0);
  }, [cxcPortfolio]);

  // Fetch statement for selected client
  const fetchStatement = async (client) => {
    setSelectedClient(client);
    setLoadingStatement(true);
    setPaymentForm({ amount: '', method: 'Transferencia', reference: '' });
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/client/${client.id || client.clientId}/statement`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStatement(json);
      } else {
        // Fallback: build from local state
        const localOrders = orders.filter(ord => ord.clientId === (client.id || client.clientId));
        setStatement({
          client,
          orders: localOrders,
          payments: (data.pagosClientes || []).filter(p => p.clientId === (client.id || client.clientId))
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Jump from Antiguedad to Estado de Cuenta
  const handleSelectFromAntiguedad = (clientRow) => {
    const c = clients.find(item => item.id === (clientRow.clientId || clientRow.id)) || clientRow;
    fetchStatement(c);
    setMainView('edo_cuenta');
  };

  // Keep statement in sync when data changes
  useEffect(() => {
    if (selectedClient) {
      const updated = cxcPortfolio.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    }
  }, [cxcPortfolio]);

  // Handle payment submission
  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert('Por favor ingrese un monto de abono válido mayor a $0.');
      return;
    }

    setPaying(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClient.id || selectedClient.clientId,
          amount: amount,
          paymentMethod: paymentForm.method,
          reference: paymentForm.reference || `ABONO-${Date.now().toString().slice(-6)}`
        })
      });

      if (res.ok) {
        alert(`Abono por ${pesosDecimals(amount)} registrado exitosamente.`);
        setPaymentForm({ amount: '', method: 'Transferencia', reference: '' });
        if (reloadState) await reloadState();
        if (selectedClient) fetchStatement(selectedClient);
      } else {
        const errorText = await res.text();
        alert(`Error al registrar el abono: ${errorText}`);
      }
    } catch (err) {
      console.error('Error al registrar abono:', err);
      alert('Error de conexión al registrar el abono.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="view-container animate-fade-in" style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. CABECERA PRINCIPAL DEL MÓDULO */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 30px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>💰</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
              Cuentas por Cobrar (CxC)
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13.5px' }}>
            Control de cobranza a clientes, antigüedad de saldos con fecha de corte y conciliación de abonos.
          </p>
        </div>

        {/* SELECTOR DE SUB-VISTAS PRINCIPALES */}
        <div 
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            gap: '4px'
          }}
        >
          <button
            onClick={() => setMainView('antiguedad')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: mainView === 'antiguedad' ? '#2563eb' : 'transparent',
              color: mainView === 'antiguedad' ? '#ffffff' : '#475569',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxShadow: mainView === 'antiguedad' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none'
            }}
          >
            <span>📊</span>
            <span>Antigüedad de Saldos</span>
          </button>

          <button
            onClick={() => setMainView('edo_cuenta')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: mainView === 'edo_cuenta' ? '#2563eb' : 'transparent',
              color: mainView === 'edo_cuenta' ? '#ffffff' : '#475569',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxShadow: mainView === 'edo_cuenta' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none'
            }}
          >
            <span>📋</span>
            <span>Estado de Cuenta & Cobranza</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VISTA 1: ANTIGÜEDAD DE SALDOS CLIENTES                                */}
      {/* ========================================================================= */}
      {mainView === 'antiguedad' && (
        <AntiguedadSaldosClientes 
          data={data} 
          onSelectClientForStatement={handleSelectFromAntiguedad}
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-VISTA 2: ESTADO DE CUENTA & COBRANZA                                   */}
      {/* ========================================================================= */}
      {mainView === 'edo_cuenta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tarjetas KPI de Estado de Cuenta */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '16px' 
            }}
          >
            <div 
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '18px 20px',
                border: '1px solid #cbd5e1',
                borderLeft: '5px solid #2563eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOTAL POR COBRAR
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e3a8a', marginTop: '4px' }}>
                {pesosDecimals(totalReceivable)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {clientsWithDebtCount} clientes con saldo deudor
              </div>
            </div>

            <div 
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '18px 20px',
                border: '1px solid #cbd5e1',
                borderLeft: '5px solid #dc2626',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CARTERA VENCIDA
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#991b1b', marginTop: '4px' }}>
                {pesosDecimals(totalOverdueReceivable)}
              </div>
              <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>
                {overdueOrdersTotalCount} remisiones vencidas
              </div>
            </div>

            <div 
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '18px 20px',
                border: '1px solid #cbd5e1',
                borderLeft: '5px solid #059669',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CARTERA VIGENTE
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
                {pesosDecimals(Math.max(0, totalReceivable - totalOverdueReceivable))}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Dentro de plazo de crédito
              </div>
            </div>

            <div 
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '18px 20px',
                border: '1px solid #cbd5e1',
                borderLeft: '5px solid #64748b',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOTAL CLIENTES REGISTRADOS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {clients.length}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Catálogo global de clientes
              </div>
            </div>
          </div>

          {/* Grid Principal: Lista de Clientes (Izq) + Detalle de Estado de Cuenta (Der) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* PANEL IZQUIERDO: Directorio y Cartera de Clientes */}
            <div 
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {/* Buscador y Filtros */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <input 
                  type="text"
                  placeholder="🔍 Buscar por Cliente, RFC, Zona, Razón Social..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'debt', label: 'Con Saldo Deudor' },
                    { id: 'overdue', label: 'Con Cartera Vencida' },
                    { id: 'all', label: 'Todos los Clientes' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: filterType === f.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        background: filterType === f.id ? '#eff6ff' : '#ffffff',
                        color: filterType === f.id ? '#1d4ed8' : '#475569',
                        fontSize: '12px',
                        fontWeight: filterType === f.id ? 800 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla de Clientes */}
              <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>CLIENTE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>SALDO ACTUAL</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>ESTATUS</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPortfolio.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                          No se encontraron clientes con el criterio de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredPortfolio.map(c => {
                        const isSelected = selectedClient && (selectedClient.id === c.id);
                        return (
                          <tr 
                            key={c.id}
                            onClick={() => fetchStatement(c)}
                            style={{
                              borderBottom: '1px solid #e2e8f0',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'background 0.1s ease'
                            }}
                          >
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                                {c.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                <span>RFC: <b>{c.rfc || 'S/RFC'}</b></span>
                                <span style={{ margin: '0 4px' }}>•</span>
                                <span>Zona: <b>{c.zone || 'General'}</b></span>
                              </div>
                            </td>

                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ fontWeight: 900, color: c.currentBalance > 0 ? '#1e3a8a' : '#64748b', fontSize: '13px' }}>
                                {pesosDecimals(c.currentBalance)}
                              </div>
                              {c.overdueDebt > 0 && (
                                <div style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 700 }}>
                                  Vencido: {pesosDecimals(c.overdueDebt)}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {c.currentBalance <= 0 ? (
                                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 700 }}>
                                  Al corriente
                                </span>
                              ) : c.hasOverdue ? (
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 800 }}>
                                  Vencido
                                </span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 700 }}>
                                  Pendiente
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); fetchStatement(c); }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isSelected ? '#2563eb' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#475569',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isSelected ? 'Viendo' : 'Ver'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL DERECHO: Detalle del Cliente, Registro de Abono y Movimientos */}
            <div 
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                position: 'sticky',
                top: '20px'
              }}
            >
              {selectedClient ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Encabezado del Cliente Seleccionado */}
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                          {selectedClient.name}
                        </h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <span>RFC: <b>{selectedClient.rfc || 'S/RFC'}</b></span>
                          <span style={{ margin: '0 6px' }}>•</span>
                          <span>Zona: <b>{selectedClient.zone || 'General'}</b></span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                          SALDO ACTUAL
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: selectedClient.currentBalance > 0 ? '#1e3a8a' : '#059669' }}>
                          {pesosDecimals(selectedClient.currentBalance)}
                        </div>
                      </div>
                    </div>

                    {/* Barra de Crédito Utilizado vs Límite */}
                    {(selectedClient.creditLimit || 0) > 0 && (
                      <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span style={{ color: '#475569' }}>Límite de Crédito: <b>{pesos(selectedClient.creditLimit)}</b></span>
                          <span style={{ color: selectedClient.currentBalance > selectedClient.creditLimit ? '#dc2626' : '#059669', fontWeight: 700 }}>
                            {Math.round(((selectedClient.currentBalance || 0) / selectedClient.creditLimit) * 100)}% utilizado
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${Math.min(100, Math.round(((selectedClient.currentBalance || 0) / selectedClient.creditLimit) * 100))}%`, 
                              height: '100%', 
                              background: selectedClient.currentBalance > selectedClient.creditLimit ? '#dc2626' : '#2563eb' 
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FORMULARIO DE REGISTRO DE ABONO */}
                  <div 
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💵</span>
                      <span>Registrar Nuevo Abono de Cliente</span>
                    </div>

                    <form onSubmit={handleRegisterPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                            Monto a Abonar ($) *
                          </label>
                          <input 
                            type="number"
                            step="any"
                            min="0.01"
                            max={selectedClient.currentBalance > 0 ? selectedClient.currentBalance : undefined}
                            placeholder="0.00"
                            required
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                            Método de Pago *
                          </label>
                          <select
                            value={paymentForm.method}
                            onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              background: '#ffffff'
                            }}
                          >
                            <option>Transferencia</option>
                            <option>Efectivo</option>
                            <option>Cheque</option>
                            <option>Tarjeta Débito/Crédito</option>
                            <option>Depósito</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                          Referencia / Folio / Banco
                        </label>
                        <input 
                          type="text"
                          placeholder="Ej. SPEI 839218 / Cheque #492"
                          value={paymentForm.reference}
                          onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={paying}
                        style={{
                          marginTop: '4px',
                          padding: '10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: paying ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(5,150,105,0.3)'
                        }}
                      >
                        {paying ? 'Procesando Abono...' : '✓ Confirmar Abono de Cliente'}
                      </button>
                    </form>
                  </div>

                  {/* PESTAÑAS DE MOVIMIENTOS: REMISIONES VS HISTORIAL DE ABONOS */}
                  <div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '10px', marginBottom: '10px' }}>
                      <button
                        onClick={() => setActiveTab('orders')}
                        style={{
                          padding: '8px 14px',
                          background: 'none',
                          border: 'none',
                          borderBottom: activeTab === 'orders' ? '3px solid #2563eb' : '3px solid transparent',
                          color: activeTab === 'orders' ? '#1e40af' : '#64748b',
                          fontWeight: activeTab === 'orders' ? 800 : 600,
                          fontSize: '12.5px',
                          cursor: 'pointer'
                        }}
                      >
                        📄 Remisiones / Pedidos ({statement?.orders?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTab('payments')}
                        style={{
                          padding: '8px 14px',
                          background: 'none',
                          border: 'none',
                          borderBottom: activeTab === 'payments' ? '3px solid #2563eb' : '3px solid transparent',
                          color: activeTab === 'payments' ? '#1e40af' : '#64748b',
                          fontWeight: activeTab === 'payments' ? 800 : 600,
                          fontSize: '12.5px',
                          cursor: 'pointer'
                        }}
                      >
                        💰 Abonos Realizados ({statement?.payments?.length || 0})
                      </button>
                    </div>

                    {loadingStatement ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        Cargando estado de cuenta...
                      </div>
                    ) : (
                      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {activeTab === 'orders' ? (
                          statement?.orders?.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                              No hay remisiones registradas para este cliente.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {statement?.orders?.map((ord, idx) => {
                                const debt = (ord.totalAmount || 0) - (ord.amountPaid || 0);
                                return (
                                  <div 
                                    key={idx}
                                    style={{
                                      padding: '10px 12px',
                                      background: debt > 0 ? '#fffbeb' : '#f8fafc',
                                      borderRadius: '8px',
                                      border: debt > 0 ? '1px solid #fef3c7' : '1px solid #e2e8f0',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                                        {ord.orderNumber}
                                        {ord.isFacturado && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '1px 4px', borderRadius: '4px' }}>SAT</span>}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                                        Emisión: {ord.date ? ord.date.split('T')[0] : '-'}
                                        {ord.dueDate && ` • Vence: ${ord.dueDate.split('T')[0]}`}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontWeight: 900, color: debt > 0 ? '#92400e' : '#059669' }}>
                                        {debt > 0 ? `Pendiente: ${pesosDecimals(debt)}` : 'Liquidado ✓'}
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                        Total: {pesosDecimals(ord.totalAmount)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          statement?.payments?.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                              No hay historial de abonos para este cliente.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {statement?.payments?.map((pay, idx) => (
                                <div 
                                  key={idx}
                                  style={{
                                    padding: '10px 12px',
                                    background: '#ecfdf5',
                                    borderRadius: '8px',
                                    border: '1px solid #a7f3d0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#065f46' }}>
                                      Abono ({pay.paymentMethod || 'Pago'})
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#047857', marginTop: '1px' }}>
                                      Fecha: {pay.date ? pay.date.split('T')[0] : '-'}
                                      {pay.reference && ` • Ref: ${pay.reference}`}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: '13px' }}>
                                    +{pesosDecimals(pay.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>👥</div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 800 }}>
                    Ningún cliente seleccionado
                  </h3>
                  <p style={{ fontSize: '13px', margin: '6px 0 0 0' }}>
                    Selecciona un cliente de la lista de la izquierda o desde la tabla de Antigüedad para consultar su estado de cuenta y registrar abonos.
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
