/* eslint-disable */
import { useState, useMemo, useEffect } from 'react';
import { pesos, pesosDecimals } from '../utils/helpers';
import AntiguedadSaldosClientes from './AntiguedadSaldosClientes';

export default function Cobranza({ data, reloadState, initialView }) {
  // Main module sub-view: 'antiguedad' (Antigüedad de Saldos Clientes) or 'edo_cuenta' (Estado de Cuenta & Cobranza) or 'pago' (Detalle del Pago)
  const [step, setStep] = useState(initialView || 'antiguedad');

  // Estado de Cuenta Sub-view state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('debt'); // 'debt', 'overdue', 'all'
  const [selectedClient, setSelectedClient] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [paying, setPaying] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [successPaymentMsg, setSuccessPaymentMsg] = useState(false);
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
  const orders = useMemo(() => data.pedidos || [], [data.pedidos]);

  // Calculate detailed CxC portfolio data per client
  const cxcPortfolio = useMemo(() => {
    const now = new Date();
    return clients.map(c => {
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
      return true;
    }).sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0));
  }, [cxcPortfolio, search, filterType]);

  // Global KPIs
  const totalReceivable = useMemo(() => cxcPortfolio.reduce((acc, c) => acc + (c.currentBalance || 0), 0), [cxcPortfolio]);
  const totalOverdueReceivable = useMemo(() => cxcPortfolio.reduce((acc, c) => acc + (c.overdueDebt || 0), 0), [cxcPortfolio]);
  const clientsWithDebtCount = useMemo(() => cxcPortfolio.filter(c => (c.currentBalance || 0) > 0).length, [cxcPortfolio]);
  const overdueOrdersTotalCount = useMemo(() => cxcPortfolio.reduce((acc, c) => acc + (c.overdueOrdersCount || 0), 0), [cxcPortfolio]);

  // Fetch statement for selected client
  const fetchStatement = async (client) => {
    setSelectedClient(client);
    setLoadingStatement(true);
    setPaymentForm({ amount: '', method: 'Transferencia', reference: '' });
    setSelectedOrderIds([]);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/client/${client.id || client.clientId}/statement`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStatement(json);
      } else {
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

  // Jump from Antigüedad to Estado de Cuenta
  const handleSelectFromAntiguedad = (clientRow) => {
    const c = clients.find(item => item.id === (clientRow.clientId || clientRow.id)) || clientRow;
    fetchStatement(c);
    setStep('edo_cuenta');
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClient.id || selectedClient.clientId,
          amount,
          paymentMethod: paymentForm.method,
          reference: paymentForm.reference || `ABONO-${Date.now().toString().slice(-6)}`,
          selectedOrderIds
        })
      });
      if (res.ok) {
        alert(`Abono por ${pesosDecimals(amount)} registrado exitosamente.`);
        setPaymentForm({ amount: '', method: 'Transferencia', reference: '' });
    setSelectedOrderIds([]);
        if (reloadState) await reloadState();
        if (selectedClient) fetchStatement(selectedClient);
        // Advance to payment detail step
        setStep('pago');
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
      {/* CABECERA PRINCIPAL */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 30px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>💰 Cuentas por Cobrar (CxC)</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13.5px' }}>Control de cobranza a clientes, antigüedad de saldos con fecha de corte y conciliación de abonos.</p>
        </div>
        {/* SELECTOR DE SUB‑VISTAS */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '4px' }}>
          <button
            onClick={() => setStep('antiguedad')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: step === 'antiguedad' ? '#2563eb' : 'transparent',
              color: step === 'antiguedad' ? '#ffffff' : '#475569',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxShadow: step === 'antiguedad' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none'
            }}
          >
            <span>📊</span>
            <span>Antigüedad de Saldos</span>
          </button>
          <button
            onClick={() => setStep('edo_cuenta')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: step === 'edo_cuenta' ? '#2563eb' : 'transparent',
              color: step === 'edo_cuenta' ? '#ffffff' : '#475569',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxShadow: step === 'edo_cuenta' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none'
            }}
          >
            <span>📋</span>
            <span>Estado de Cuenta & Cobranza</span>
          </button>
        </div>
      </div>

      {/* SUB‑VISTA ANTIGÜEDAD */}
      {step === 'antiguedad' && (
        <AntiguedadSaldosClientes data={data} onSelectClientForStatement={handleSelectFromAntiguedad} />
      )}

      {/* SUB‑VISTA ESTADO DE CUENTA */}
      {step === 'edo_cuenta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Back button */}
          <button
            onClick={() => setStep('antiguedad')}
            style={{
              alignSelf: 'flex-start',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >← Atrás</button>
          {/* KPI cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {/* TOTAL POR COBRAR */}
            <div style={{ flex: '1 1 220px', background: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #cbd5e1', borderLeft: '5px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL POR COBRAR</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e3a8a', marginTop: '4px' }}>{pesosDecimals(totalReceivable)}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{clientsWithDebtCount} clientes con saldo deudor</div>
            </div>
            {/* CARTERA VENCIDA */}
            <div style={{ flex: '1 1 220px', background: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #cbd5e1', borderLeft: '5px solid #dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CARTERA VENCIDA</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#991b1b', marginTop: '4px' }}>{pesosDecimals(totalOverdueReceivable)}</div>
              <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>{overdueOrdersTotalCount} remisiones vencidas</div>
            </div>
            {/* CARTERA VIGENTE */}
            <div style={{ flex: '1 1 220px', background: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #cbd5e1', borderLeft: '5px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CARTERA VIGENTE</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>{pesosDecimals(Math.max(0, totalReceivable - totalOverdueReceivable))}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Dentro de plazo de crédito</div>
            </div>
            {/* TOTAL CLIENTES */}
            <div style={{ flex: '1 1 220px', background: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #cbd5e1', borderLeft: '5px solid #64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL CLIENTES REGISTRADOS</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{clients.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Catálogo global de clientes</div>
            </div>
          </div>

          {/* Grid Principal: Lista de Clientes + Detalle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', alignItems: 'start' }}>
            {/* PANEL IZQUIERDO */}
            <div style={{ display: selectedClient ? 'none' : 'block', background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {/* Buscador y filtros */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por Cliente, RFC, Zona, Razón Social..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
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
                        <td colSpan="4" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>No se encontraron clientes con el criterio de búsqueda.</td>
                      </tr>
                    ) : (
                      filteredPortfolio.map(c => {
                        const isSelected = selectedClient && selectedClient.id === c.id;
                        return (
                          <tr key={c.id} onClick={() => fetchStatement(c)}
                            style={{ borderBottom: '1px solid #e2e8f0', background: isSelected ? '#eff6ff' : '#ffffff', cursor: 'pointer', transition: 'background 0.1s ease' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{c.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                <span>RFC: <b>{c.rfc || 'S/RFC'}</b></span>
                                <span style={{ margin: '0 4px' }}>•</span>
                                <span>Zona: <b>{c.zone || 'General'}</b></span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ fontWeight: 900, color: c.currentBalance > 0 ? '#1e3a8a' : '#64748b', fontSize: '13px' }}>{pesosDecimals(c.currentBalance)}</div>
                              {c.overdueDebt > 0 && (
                                <div style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 700 }}>Vencido: {pesosDecimals(c.overdueDebt)}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {c.currentBalance <= 0 ? (
                                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 700 }}>Al corriente</span>
                              ) : c.hasOverdue ? (
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 800 }}>Vencido</span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 700 }}>Pendiente</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                onClick={e => { e.stopPropagation(); fetchStatement(c); }}
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
                              >{isSelected ? 'Viendo' : 'Ver'}</button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL DERECHO */}
            {selectedClient && (
              <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'sticky', top: '20px' }}>
                {/* Header */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{selectedClient.name}</h2>
                        <button onClick={() => setSelectedClient(null)} title="Cerrar detalles"
                          style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '12px' }}>✖</button>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        <span>RFC: <b>{selectedClient.rfc || 'S/RFC'}</b></span>
                        <span style={{ margin: '0 6px' }}>•</span>
                        <span>Zona: <b>{selectedClient.zone || 'General'}</b></span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SALDO ACTUAL</div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: selectedClient.currentBalance > 0 ? '#1e3a8a' : '#059669' }}>{pesosDecimals(selectedClient.currentBalance)}</div>
                    </div>
                  </div>
                </div>
                {/* Credit limit bar */}
                {(selectedClient.creditLimit || 0) > 0 && (
                  <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                      <span style={{ color: '#475569' }}>Límite de Crédito: <b>{pesos(selectedClient.creditLimit)}</b></span>
                      <span style={{ color: selectedClient.currentBalance > selectedClient.creditLimit ? '#dc2626' : '#059669', fontWeight: 700 }}>{Math.round(((selectedClient.currentBalance || 0) / selectedClient.creditLimit) * 100)}% utilizado</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.round(((selectedClient.currentBalance || 0) / selectedClient.creditLimit) * 100))}%`, height: '100%', background: selectedClient.currentBalance > selectedClient.creditLimit ? '#dc2626' : '#2563eb' }}></div>
                    </div>
                  </div>
                )}
                                {/* Facturas Pendientes (Seleccionables) */}
                {statement && statement.orders && statement.orders.filter(o => o.amountPaid < o.totalAmount && (o.paymentMethod === 'Crédito' || o.paymentMethod === 'Credito' || o.paymentMethod === 'CrÃ©dito')).length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '10px', color: '#0f172a', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Facturas Pendientes</span>
                      <span style={{ color: '#64748b', fontWeight: 'normal' }}>Selecciona para abonar a facturas específicas</span>
                    </h4>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'center' }}>
                              <input type="checkbox" onChange={e => {
                                const pending = statement.orders.filter(o => o.amountPaid < o.totalAmount && (o.paymentMethod === 'Crédito' || o.paymentMethod === 'Credito' || o.paymentMethod === 'CrÃ©dito'));
                                if (e.target.checked) {
                                  setSelectedOrderIds(pending.map(o => o.id));
                                  const total = pending.reduce((sum, o) => sum + (o.totalAmount - o.amountPaid), 0);
                                  setPaymentForm({ ...paymentForm, amount: total });
                                } else {
                                  setSelectedOrderIds([]);
                                  setPaymentForm({ ...paymentForm, amount: '' });
                                }
                              }} />
                            </th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Folio</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Pagado</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statement.orders.filter(o => o.amountPaid < o.totalAmount && (o.paymentMethod === 'Crédito' || o.paymentMethod === 'Credito' || o.paymentMethod === 'CrÃ©dito')).map(o => {
                            const debt = o.totalAmount - o.amountPaid;
                            return (
                              <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={e => {
                                    if (e.target.checked) {
                                      const newSelection = [...selectedOrderIds, o.id];
                                      setSelectedOrderIds(newSelection);
                                      const pending = statement.orders.filter(po => newSelection.includes(po.id));
                                      const total = pending.reduce((sum, po) => sum + (po.totalAmount - po.amountPaid), 0);
                                      setPaymentForm({ ...paymentForm, amount: total });
                                    } else {
                                      const newSelection = selectedOrderIds.filter(id => id !== o.id);
                                      setSelectedOrderIds(newSelection);
                                      const pending = statement.orders.filter(po => newSelection.includes(po.id));
                                      const total = pending.reduce((sum, po) => sum + (po.totalAmount - po.amountPaid), 0);
                                      setPaymentForm({ ...paymentForm, amount: total || '' });
                                    }
                                  }} />
                                </td>
                                <td style={{ padding: '8px', fontWeight: 'bold' }}>{o.orderNumber || o.id}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{pesos(o.totalAmount)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{pesos(o.amountPaid)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{pesos(debt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Formulario de Abono */}
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', marginTop: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>💵</span> Registrar Nuevo Abono de Cliente
                  </h4>
                  <form onSubmit={handleRegisterPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Monto a Abonar ($) *</label>
                        <input
                          type="number"
                          step="any"
                          className="input full"
                          placeholder="0.00"
                          required
                          value={paymentForm.amount}
                          onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Método de Pago *</label>
                        <select
                          className="input full"
                          value={paymentForm.method}
                          onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        >
                          <option>Transferencia</option>
                          <option>Efectivo</option>
                          <option>Cheque</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Referencia / Folio / Banco</label>
                      <input
                        className="input full"
                        placeholder="Ej. SPEI 839218 / Cheque #492"
                        value={paymentForm.reference}
                        onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn success full" style={{ padding: '12px', fontSize: '15px' }} disabled={paying}>
                      {paying ? 'Procesando...' : '✓ Confirmar Abono de Cliente'}
                    </button>
                  </form>
                </div>
                <div style={{ marginTop: '15px' }}>
                  <button onClick={() => setSelectedClient(null)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>← Volver a la lista</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB‑VISTA PAGO (Detalle del Pago) */}
      {step === 'pago' && (
        <div style={{ padding: '40px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✅</div>
          <h2>¡Abono Registrado Exitosamente!</h2>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>El pago ha sido aplicado al estado de cuenta del cliente y sus saldos fueron actualizados.</p>
          <button onClick={() => setStep('edo_cuenta')} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #2563eb', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, cursor: 'pointer', fontSize: '15px' }}>← Volver al Estado de Cuenta</button>
        </div>
      )}
    </div>
  );
}
