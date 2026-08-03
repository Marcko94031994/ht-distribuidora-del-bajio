import React, { useState } from 'react';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

export default function Clientes({ data, addCliente, updateCliente, ruta }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Modal form state
  const [formState, setFormState] = useState({
    name: '',
    zone: '',
    latitude: 0,
    longitude: 0,
    routeId: '',
    creditLimit: 0,
    creditDays: 15,
    rfc: '',
    razonSocial: '',
    regimenFiscal: '',
    codigoPostal: '',
    formaPago: '',
    metodoPago: '',
    usoCFDI: '',
    telefonos: '',
    celular: '',
    email1: '',
    email2: '',
    email3: '',
    colonia: '',
    localidad: '',
    municipio: '',
    referencia: '',
    isBlocked: false
  });

  const startEdit = (c) => {
    setEditing(c);
    setFormState({
      name: c.name || '',
      zone: c.zone || '',
      latitude: c.latitude || 0,
      longitude: c.longitude || 0,
      routeId: c.routeId ? String(c.routeId) : '',
      creditLimit: c.creditLimit || 0,
      creditDays: c.creditDays || 15,
      rfc: c.rfc || '',
      razonSocial: c.razonSocial || '',
      regimenFiscal: c.regimenFiscal || '',
      codigoPostal: c.codigoPostal || '',
      formaPago: c.formaPago || '',
      metodoPago: c.metodoPago || '',
      usoCFDI: c.usoCFDI || '',
      telefonos: c.telefonos || '',
      celular: c.celular || '',
      email1: c.email1 || '',
      email2: c.email2 || '',
      email3: c.email3 || '',
      colonia: c.colonia || '',
      localidad: c.localidad || '',
      municipio: c.municipio || '',
      referencia: c.referencia || '',
      isBlocked: !!c.isBlocked
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditing(null);
    setFormState({
      name: '',
      zone: '',
      latitude: 0,
      longitude: 0,
      routeId: data.rutas?.[0]?.id ? String(data.rutas[0].id) : '',
      creditLimit: 0,
      creditDays: 15,
      rfc: '',
      razonSocial: '',
      regimenFiscal: '',
      codigoPostal: '',
      formaPago: '01',
      metodoPago: 'PUE',
      usoCFDI: 'G03',
      telefonos: '',
      celular: '',
      email1: '',
      email2: '',
      email3: '',
      colonia: '',
      localidad: '',
      municipio: '',
      referencia: '',
      isBlocked: false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: formState.name,
      zone: formState.zone,
      latitude: Number(formState.latitude || 0),
      longitude: Number(formState.longitude || 0),
      routeId: Number(formState.routeId || 0),
      creditLimit: Number(formState.creditLimit || 0),
      creditDays: Number(formState.creditDays || 15),
      rfc: formState.rfc,
      razonSocial: formState.razonSocial,
      regimenFiscal: formState.regimenFiscal,
      codigoPostal: formState.codigoPostal,
      formaPago: formState.formaPago,
      metodoPago: formState.metodoPago,
      usoCFDI: formState.usoCFDI,
      telefonos: formState.telefonos,
      celular: formState.celular,
      email1: formState.email1,
      email2: formState.email2,
      email3: formState.email3,
      colonia: formState.colonia,
      localidad: formState.localidad,
      municipio: formState.municipio,
      referencia: formState.referencia,
      isBlocked: Boolean(formState.isBlocked)
    };

    if (editing) {
      updateCliente(editing.id, payload);
    } else {
      addCliente(payload);
    }
    setShowForm(false);
    setEditing(null);
  };

  // Get complete list of clients from data.clientes or flattened from rutas
  const rawClients = data.clientes && data.clientes.length > 0 
    ? data.clientes 
    : (data.rutas || []).flatMap(r => (r.clients || r.clientes || []));

  // Deduplicate by ID
  const clientsMap = new Map();
  rawClients.forEach(c => {
    if (c && c.id) clientsMap.set(c.id, c);
  });
  const allClients = Array.from(clientsMap.values());

  const filteredClients = allClients.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.rfc && c.rfc.toLowerCase().includes(term)) ||
      (c.razonSocial && c.razonSocial.toLowerCase().includes(term)) ||
      (c.colonia && c.colonia.toLowerCase().includes(term)) ||
      (c.municipio && c.municipio.toLowerCase().includes(term)) ||
      (c.zone && c.zone.toLowerCase().includes(term)) ||
      (c.telefonos && c.telefonos.toLowerCase().includes(term)) ||
      (c.celular && c.celular.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* FORMULARIO DE ALTA / EDICIÓN */}
      {showForm ? (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{editing ? `✏️ Editar Cliente #${editing.id}` : '➕ Nuevo Cliente'}</h3>
            <button className="btn secondary" onClick={() => { setEditing(null); setShowForm(false); }}>Cancelar</button>
          </div>
          <div className="card-b">
              <form onSubmit={handleSubmit} className="form-grid">
                
                {/* 1. DATOS GENERALES */}
                <h4 style={{ gridColumn: '1 / -1', margin: '5px 0', borderBottom: '2px solid var(--primary)', paddingBottom: '4px', color: 'var(--primary)' }}>
                  👤 Información Comercial
                </h4>
                
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Nombre Comercial *</label>
                  <input 
                    name="name" 
                    className="input full" 
                    placeholder="Ej. Abarrotes La Lupita" 
                    value={formState.name} 
                    onChange={e => setFormState({ ...formState, name: e.target.value })} 
                    required 
                  />
                </div>

                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Ruta de Entrega Asignada *</label>
                  <SearchableSelect
                    options={data.rutas || []}
                    value={formState.routeId}
                    onChange={val => setFormState({ ...formState, routeId: val })}
                    getOptionLabel={r => `${r.name} (${r.dayOfWeek || 'Lunes'})`}
                    getOptionValue={r => r.id}
                    placeholder="Seleccionar Ruta..."
                    required
                  />
                </div>

                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Zona / Región</label>
                  <input 
                    name="zone" 
                    className="input full" 
                    placeholder="Ej. León Centro, Zona Norte" 
                    value={formState.zone} 
                    onChange={e => setFormState({ ...formState, zone: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Límite de Crédito ($)</label>
                    <input 
                      name="creditLimit" 
                      type="number" 
                      step="any" 
                      className="input full" 
                      placeholder="0.00" 
                      value={formState.creditLimit} 
                      onChange={e => setFormState({ ...formState, creditLimit: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Días de Crédito</label>
                    <input 
                      name="creditDays" 
                      type="number" 
                      className="input full" 
                      placeholder="15" 
                      value={formState.creditDays} 
                      onChange={e => setFormState({ ...formState, creditDays: e.target.value })} 
                    />
                  </div>
                </div>

                {/* 2. DATOS FISCALES */}
                <h4 style={{ gridColumn: '1 / -1', margin: '15px 0 5px 0', borderBottom: '2px solid var(--primary)', paddingBottom: '4px', color: 'var(--primary)' }}>
                  🧾 Datos Fiscales y Facturación (SAT)
                </h4>

                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>RFC</label>
                  <input 
                    name="rfc" 
                    className="input full" 
                    placeholder="XAXX010101000" 
                    value={formState.rfc} 
                    onChange={e => setFormState({ ...formState, rfc: e.target.value.toUpperCase() })} 
                  />
                </div>

                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Razón Social</label>
                  <input 
                    name="razonSocial" 
                    className="input full" 
                    placeholder="Nombre o Razón Social registrada" 
                    value={formState.razonSocial} 
                    onChange={e => setFormState({ ...formState, razonSocial: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Régimen Fiscal (SAT)</label>
                    <input 
                      name="regimenFiscal" 
                      className="input full" 
                      placeholder="601, 612, 626..." 
                      value={formState.regimenFiscal} 
                      onChange={e => setFormState({ ...formState, regimenFiscal: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Código Postal (CP)</label>
                    <input 
                      name="codigoPostal" 
                      className="input full" 
                      placeholder="37000" 
                      value={formState.codigoPostal} 
                      onChange={e => setFormState({ ...formState, codigoPostal: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Uso de CFDI</label>
                  <select 
                    name="usoCFDI" 
                    className="select full" 
                    value={formState.usoCFDI} 
                    onChange={e => setFormState({ ...formState, usoCFDI: e.target.value })}
                  >
                    <option value="">Por definir (G03 / G01 / S01)</option>
                    <option value="G01">G01 - Adquisición de mercancías</option>
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="P01">P01 - Por definir</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                    <option value="CP01">CP01 - Pagos</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Forma de Pago SAT</label>
                    <select 
                      name="formaPago" 
                      className="select full" 
                      value={formState.formaPago} 
                      onChange={e => setFormState({ ...formState, formaPago: e.target.value })}
                    >
                      <option value="01">01 - Efectivo</option>
                      <option value="02">02 - Cheque nominativo</option>
                      <option value="03">03 - Transferencia electrónica</option>
                      <option value="04">04 - Tarjeta de crédito</option>
                      <option value="28">28 - Tarjeta de débito</option>
                      <option value="99">99 - Por definir</option>
                    </select>
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Método de Pago</label>
                    <select 
                      name="metodoPago" 
                      className="select full" 
                      value={formState.metodoPago} 
                      onChange={e => setFormState({ ...formState, metodoPago: e.target.value })}
                    >
                      <option value="PUE">PUE - Pago en una sola exhibición</option>
                      <option value="PPD">PPD - Pago en parcialidades o diferido</option>
                    </select>
                  </div>
                </div>

                {/* 3. DOMICILIO Y CONTACTO */}
                <h4 style={{ gridColumn: '1 / -1', margin: '15px 0 5px 0', borderBottom: '2px solid var(--primary)', paddingBottom: '4px', color: 'var(--primary)' }}>
                  📍 Domicilio y Contacto
                </h4>

                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Colonia</label>
                  <input 
                    name="colonia" 
                    className="input full" 
                    placeholder="Colonia / Barrio" 
                    value={formState.colonia} 
                    onChange={e => setFormState({ ...formState, colonia: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Municipio</label>
                    <input 
                      name="municipio" 
                      className="input full" 
                      placeholder="Municipio / Alcaldía" 
                      value={formState.municipio} 
                      onChange={e => setFormState({ ...formState, municipio: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Localidad / Ciudad</label>
                    <input 
                      name="localidad" 
                      className="input full" 
                      placeholder="Ciudad / Localidad" 
                      value={formState.localidad} 
                      onChange={e => setFormState({ ...formState, localidad: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="muted" style={{ fontSize: '12px' }}>Referencia de Domicilio</label>
                  <input 
                    name="referencia" 
                    className="input full" 
                    placeholder="Ej. Frente al parque, fachada color verde, portón blanco..." 
                    value={formState.referencia} 
                    onChange={e => setFormState({ ...formState, referencia: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Teléfono Fijo</label>
                    <input 
                      name="telefonos" 
                      className="input full" 
                      placeholder="Teléfono fijo" 
                      value={formState.telefonos} 
                      onChange={e => setFormState({ ...formState, telefonos: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Celular / WhatsApp</label>
                    <input 
                      name="celular" 
                      className="input full" 
                      placeholder="Celular" 
                      value={formState.celular} 
                      onChange={e => setFormState({ ...formState, celular: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="muted" style={{ fontSize: '12px' }}>Correo Electrónico (Para facturación y pedidos)</label>
                  <input 
                    name="email1" 
                    type="email" 
                    className="input full" 
                    placeholder="correo@ejemplo.com" 
                    value={formState.email1} 
                    onChange={e => setFormState({ ...formState, email1: e.target.value })} 
                  />
                </div>

                {/* 4. BLOQUEO Y GPS */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--line)', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formState.isBlocked} 
                      onChange={e => setFormState({ ...formState, isBlocked: e.target.checked })} 
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 'bold', color: formState.isBlocked ? 'var(--danger)' : 'var(--text)' }}>
                      🚫 Bloquear Cliente (No permitir ventas a crédito ni pedidos)
                    </span>
                  </label>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button type="submit" className={`btn ${editing ? 'warn' : 'success'} full`} style={{ padding: '12px', fontSize: '1rem', fontWeight: 'bold' }}>
                    {editing ? '💾 Guardar Cambios del Cliente' : '✅ Registrar Nuevo Cliente'}
                  </button>
                </div>
              </form>
            </div>
        </div>
      ) : (
        /* VISTA PRINCIPAL DEL DIRECTORIO */
        <div className="card">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Directorio de Clientes</h3>
            <span className="muted" style={{ fontSize: '12px' }}>{filteredClients.length} de {allClients.length} clientes listados</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '480px', justifyContent: 'flex-end' }}>
            <input 
              type="text" 
              className="input full" 
              placeholder="🔍 Buscar por nombre, RFC, teléfono, colonia..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '180px' }}
            />
            <button className="btn success" onClick={startNew}>+ Nuevo Cliente</button>
          </div>
        </div>

        <div className="card-b list">
          {filteredClients.map(c => {
            const isExpanded = expandedId === c.id;
            const routeObj = data.rutas?.find(r => r.id === c.routeId);
            const routeName = routeObj ? `${routeObj.name} (${routeObj.dayOfWeek || 'Lunes'})` : 'Sin ruta asignada';
            const availableCredit = (c.creditLimit || 0) - (c.currentBalance || 0);

            return (
              <div 
                className="item" 
                key={c.id} 
                style={{ 
                  borderRadius: '10px', 
                  border: isExpanded ? '1.5px solid var(--primary, #0056b3)' : '1px solid var(--line, #e2e8f0)',
                  marginBottom: '10px',
                  padding: '16px',
                  background: 'var(--card-bg, #ffffff)',
                  boxShadow: isExpanded ? '0 4px 14px rgba(0,86,179,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* CABECERA DE LA TARJETA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: '1.05rem', color: 'var(--text)' }}>{c.name}</b>
                      {c.isBlocked ? (
                        <span className="chip danger" style={{ fontWeight: 'bold' }}>🚫 Bloqueado</span>
                      ) : (
                        <span className="chip ok">Activo</span>
                      )}
                      {c.rfc && (
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                          RFC: {c.rfc}
                        </span>
                      )}
                      <button 
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        style={{
                          background: isExpanded ? 'var(--primary, #0056b3)' : '#f1f5f9',
                          color: isExpanded ? '#ffffff' : '#475569',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {isExpanded ? '▲ Menos datos' : '➕ Ver más datos'}
                      </button>
                    </div>

                    {c.razonSocial && (
                      <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                        🏢 <b>Razón Social:</b> {c.razonSocial}
                      </div>
                    )}
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button 
                      className="btn secondary" 
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                      onClick={() => startEdit(c)}
                      title="Editar Cliente"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn primary" 
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                      onClick={async () => {
                        const token = localStorage.getItem('ht_token');
                        const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/client/${c.id}/statement`, { 
                          headers: { 'Authorization': `Bearer ${token}` } 
                        });
                        if (res.ok) {
                          const { orders, payments } = await res.json();
                          setStatementData({ client: c, orders, payments });
                        }
                      }}
                      title="Ver Estado de Cuenta"
                    >
                      📋 Edo. Cuenta
                    </button>
                    <button 
                      className="btn success" 
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                      onClick={async () => {
                        const amt = prompt(`Registrar abono para ${c.name}\nSaldo actual: ${pesos(c.currentBalance || 0)}\n\nIngresa el monto:`);
                        if (!amt || isNaN(amt)) return;
                        const method = prompt("Método de pago (Efectivo, Transferencia, Cheque):", "Efectivo");
                        const token = localStorage.getItem('ht_token');
                        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/payment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ clientId: c.id, amount: Number(amt), paymentMethod: method || 'Efectivo' })
                        });
                        if (res.ok) { 
                          alert('Abono registrado correctamente'); 
                          window.location.reload(); 
                        }
                      }}
                      title="Registrar Abono"
                    >
                      💵 Abonar
                    </button>
                  </div>
                </div>

                {/* FILA DE RESUMEN: RUTA, SALDO Y CRÉDITO */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '12px', padding: '10px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: '11px', display: 'block' }}>🚚 Ruta Asignada:</span>
                    <b style={{ fontSize: '13px', color: 'var(--text)' }}>{routeName}</b>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '11px', display: 'block' }}>💳 Saldo Pendiente:</span>
                    <b style={{ fontSize: '13px', color: (c.currentBalance || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {(c.currentBalance || 0) > 0 ? pesos(c.currentBalance) : 'Al corriente ($0.00)'}
                    </b>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '11px', display: 'block' }}>🏷️ Límite Autorizado:</span>
                    <b style={{ fontSize: '13px', color: 'var(--text)' }}>{pesos(c.creditLimit || 0)}</b> &nbsp;
                    <span className="muted" style={{ fontSize: '11px' }}>({c.creditDays || 15} días)</span>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '11px', display: 'block' }}>✨ Crédito Disponible:</span>
                    <b style={{ fontSize: '13px', color: availableCredit < 0 ? 'var(--danger)' : '#059669' }}>
                      {pesos(availableCredit)}
                    </b>
                  </div>
                </div>

                {/* DETALLES EXPANDIBLES: DIRECCIÓN, CONTACTO, DATOS FISCALES */}
                {isExpanded && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--line, #cbd5e1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                      
                      {/* DIRECCIÓN */}
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: 'var(--primary)' }}>
                          📍 Domicilio y Ubicación
                        </div>
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                          <div><b>Colonia:</b> {c.colonia || c.zone || 'No registrada'}</div>
                          <div><b>Municipio:</b> {c.municipio || 'León'}</div>
                          <div><b>Localidad:</b> {c.localidad || 'Guanajuato'}</div>
                          <div><b>C.P.:</b> {c.codigoPostal || 'N/D'}</div>
                          {c.referencia && (
                            <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#64748b' }}>
                              <b>Ref:</b> {c.referencia}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CONTACTO */}
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: 'var(--primary)' }}>
                          📞 Medios de Contacto
                        </div>
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                          <div><b>Teléfono:</b> {c.telefonos || 'Sin teléfono'}</div>
                          <div><b>Celular / WhatsApp:</b> {c.celular || 'Sin celular'}</div>
                          <div><b>Email Principal:</b> {c.email1 || 'Sin correo'}</div>
                          {c.email2 && <div><b>Email Secundario:</b> {c.email2}</div>}
                        </div>
                      </div>

                      {/* FACTURACIÓN Y CONDICIONES */}
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: 'var(--primary)' }}>
                          🧾 Condiciones SAT
                        </div>
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                          <div><b>Régimen:</b> {c.regimenFiscal || 'N/D'}</div>
                          <div><b>Uso CFDI:</b> {c.usoCFDI || 'G03 Gastos en general'}</div>
                          <div><b>Forma de Pago:</b> {c.formaPago || '01 Efectivo'}</div>
                          <div><b>Método:</b> {c.metodoPago || 'PUE'}</div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredClients.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '40px' }}>
              No se encontraron clientes registrados con el término de búsqueda.
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODAL ESTADO DE CUENTA */}
      {statementData && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📋 Estado de Cuenta: {statementData.client?.name}</h3>
              <button className="btn secondary" onClick={() => setStatementData(null)}>Cerrar</button>
            </div>
            <div className="card-b">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div className="kpi-card" style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <span className="muted" style={{ fontSize: '12px' }}>Límite de Crédito</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{pesos(statementData.client?.creditLimit || 0)}</div>
                </div>
                <div className="kpi-card" style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <span className="muted" style={{ fontSize: '12px' }}>Saldo Actual</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: (statementData.client?.currentBalance || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {pesos(statementData.client?.currentBalance || 0)}
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <span className="muted" style={{ fontSize: '12px' }}>Crédito Disponible</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {pesos(Math.max(0, (statementData.client?.creditLimit || 0) - (statementData.client?.currentBalance || 0)))}
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <span className="muted" style={{ fontSize: '12px' }}>Días de Crédito</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{statementData.client?.creditDays || 15} días</div>
                </div>
              </div>

              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>📦 Historial de Pedidos y Facturas</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Folio</th>
                      <th style={{ padding: '6px 8px' }}>Fecha</th>
                      <th style={{ padding: '6px 8px' }}>Total</th>
                      <th style={{ padding: '6px 8px' }}>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statementData.orders || []).map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '6px 8px' }}><b>#{o.id}</b></td>
                        <td style={{ padding: '6px 8px' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '6px 8px' }}>{pesos(o.total)}</td>
                        <td style={{ padding: '6px 8px' }}><span className="chip ok">{o.status}</span></td>
                      </tr>
                    ))}
                    {(!statementData.orders || statementData.orders.length === 0) && (
                      <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center' }} className="muted">Sin pedidos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>💵 Historial de Abonos y Pagos</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>ID</th>
                      <th style={{ padding: '6px 8px' }}>Fecha</th>
                      <th style={{ padding: '6px 8px' }}>Monto</th>
                      <th style={{ padding: '6px 8px' }}>Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statementData.payments || []).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '6px 8px' }}><b>#{p.id}</b></td>
                        <td style={{ padding: '6px 8px' }}>{new Date(p.date).toLocaleDateString()}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--success)', fontWeight: 'bold' }}>{pesos(p.amount)}</td>
                        <td style={{ padding: '6px 8px' }}>{p.paymentMethod}</td>
                      </tr>
                    ))}
                    {(!statementData.payments || statementData.payments.length === 0) && (
                      <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center' }} className="muted">Sin pagos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
