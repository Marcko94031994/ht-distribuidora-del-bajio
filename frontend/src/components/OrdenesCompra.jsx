import React, { useState } from 'react';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

export default function OrdenesCompra({ data, producto, proveedor, reloadState }) {
  // Navigation & Filtering States
  const [statusFilter, setStatusFilter] = useState('Pendientes'); // 'Pendientes' | 'Recibidas' | 'Canceladas' | 'Todas'
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [viewingPo, setViewingPo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [providerId, setProviderId] = useState('');
  const [reference1, setReference1] = useState('');
  const [reference2, setReference2] = useState('');
  const [notes, setNotes] = useState('');
  const [detalles, setDetalles] = useState([]);

  // Detail Entry Form
  const [prodId, setProdId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [cant, setCant] = useState('');
  const [costo, setCosto] = useState('');
  const [ivaPercent, setIvaPercent] = useState('0');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');

  const selectedProduct = data.productos?.find(x => x.id === Number(prodId));
  const isPerishable = Boolean(selectedProduct?.isPerishable);

  const resetForm = () => {
    setEditingPo(null);
    setProviderId('');
    setReference1('');
    setReference2('');
    setNotes('');
    setDetalles([]);
    setProdId('');
    setWarehouseId('');
    setCant('');
    setCosto('');
    setIvaPercent('0');
    setLote('');
    setCaducidad('');
  };

  const handleStartNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleStartEdit = (oc) => {
    if (oc.status !== 'Borrador' && oc.status !== 'Pendiente') {
      alert("Esta orden ya ha sido recibida o cancelada y no puede ser modificada. Para cambios, genere una nueva orden.");
      return;
    }
    setEditingPo(oc);
    setProviderId(oc.providerId ? oc.providerId.toString() : '');
    setReference1(oc.reference1 || '');
    setReference2(oc.reference2 || '');
    setNotes(oc.notes || '');
    
    // Map existing details
    const mappedDetails = (oc.details || []).map((d, index) => ({
      id: d.id || Date.now() + index,
      productoId: d.productId,
      warehouseId: d.warehouseId || 1,
      cantidad: d.quantity,
      costo: d.unitCost,
      ivaPercent: d.ivaRate ? Math.round(d.ivaRate * 100) : 0,
      subtotal: d.subtotal || (d.quantity * d.unitCost),
      taxAmount: d.taxAmount || 0,
      total: d.total || (d.subtotal + (d.taxAmount || 0)),
      lote: d.batchNumber || '',
      caducidad: d.expirationDate ? d.expirationDate.split('T')[0] : ''
    }));
    setDetalles(mappedDetails);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductChange = (id) => {
    setProdId(id);
    if (!id) {
      setCosto('');
      setIvaPercent('0');
      setCaducidad('');
      setLote('');
      return;
    }
    const p = data.productos?.find(x => x.id === Number(id));
    if (p) {
      const defaultCost = p.cost > 0 ? p.cost : (p.cogs > 0 ? p.cogs : (p.price || ''));
      setCosto(defaultCost);
      const defaultIva = p.ivaRate ? (p.ivaRate * 100).toString() : '0';
      setIvaPercent(defaultIva);
      if (!p.isPerishable) {
        setCaducidad('');
      }
    }
  };

  const handleAddDetail = (e) => {
    e.preventDefault();
    if (!prodId || !warehouseId || !cant || !costo) return alert("Faltan campos obligatorios en el detalle");
    if (isPerishable && !caducidad) return alert("El producto es perecedero; por favor ingresa la fecha de caducidad");
    
    const qty = Number(cant);
    const unitCost = Number(costo);
    const ivaRate = Number(ivaPercent) / 100;
    const subtotal = qty * unitCost;
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;

    setDetalles([
      ...detalles, 
      {
        id: Date.now(),
        productoId: Number(prodId),
        warehouseId: Number(warehouseId),
        cantidad: qty,
        costo: unitCost,
        ivaPercent: Number(ivaPercent),
        subtotal: subtotal,
        taxAmount: tax,
        total: total,
        lote: lote || null,
        caducidad: isPerishable ? (caducidad || null) : null
      }
    ]);

    // Reset detail entry
    setProdId('');
    setCant('');
    setCosto('');
    setIvaPercent('0');
    setLote('');
    setCaducidad('');
  };

  const removeDetail = (idToRemove) => {
    setDetalles(detalles.filter(d => d.id !== idToRemove));
  };

  const handleSaveOrder = async () => {
    if (!providerId) return alert("Selecciona un proveedor");
    if (detalles.length === 0) return alert("Agrega al menos un producto a la orden");

    setLoading(true);
    try {
      const token = localStorage.getItem('ht_token');
      const url = editingPo
        ? (import.meta.env.VITE_API_URL || '') + `/api/app/purchase-order/${editingPo.id}`
        : (import.meta.env.VITE_API_URL || '') + '/api/app/purchase-order';
      const method = editingPo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerId: Number(providerId),
          reference1: reference1 || null,
          reference2: reference2 || null,
          notes: notes || null,
          Detalles: detalles.map(d => ({
            productoId: d.productoId,
            warehouseId: d.warehouseId,
            cantidad: d.cantidad,
            costo: d.costo,
            ivaPercent: d.ivaPercent,
            lote: d.lote,
            caducidad: d.caducidad
          }))
        })
      });

      if (res.ok) {
        alert(editingPo ? "✅ Orden de compra actualizada con éxito" : "✅ Orden de compra generada exitosamente en Borrador");
        resetForm();
        setShowForm(false);
        if (reloadState) reloadState();
      } else {
        const errorMsg = await res.text();
        alert("Error al procesar orden: " + errorMsg);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const autorizarRecibir = async (oc) => {
    if (!window.confirm(`¿Estás seguro de autorizar y recibir la orden ${oc.poNumber}? Esto afectará inventarios inmediatamente en almacén.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/purchase-order/${oc.id}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ht_token')}`
        }
      });
      if (res.ok) {
        alert(`✅ Orden ${oc.poNumber} autorizada y recibida en almacén exitosamente.`);
        if (reloadState) reloadState();
      } else {
        const err = await res.text();
        alert("Error al autorizar: " + err);
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (oc) => {
    if (oc.status !== 'Borrador' && oc.status !== 'Pendiente') {
      alert("No se puede cancelar una orden que ya fue recibida en inventario.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de cancelar la orden ${oc.poNumber}?`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/purchase-order/${oc.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert(`🚫 Orden ${oc.poNumber} cancelada correctamente.`);
        if (reloadState) reloadState();
      } else {
        const err = await res.text();
        alert("Error al cancelar: " + err);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const subtotalBorrador = detalles.reduce((sum, d) => sum + (d.subtotal || (d.cantidad * d.costo)), 0);
  const ivaBorrador = detalles.reduce((sum, d) => sum + (d.taxAmount || 0), 0);
  const totalBorrador = subtotalBorrador + ivaBorrador;

  // Totals for summary cards
  const allCompras = data.compras || [];
  const countPendientes = allCompras.filter(oc => oc.status === 'Borrador' || oc.status === 'Pendiente').length;
  const countRecibidas = allCompras.filter(oc => oc.status === 'Autorizada' || oc.status === 'Recibida').length;
  const countCanceladas = allCompras.filter(oc => oc.status === 'Cancelada').length;
  const totalMontoPendiente = allCompras
    .filter(oc => oc.status === 'Borrador' || oc.status === 'Pendiente')
    .reduce((sum, oc) => sum + (oc.totalAmount || 0), 0);

  // Filtered List
  const filteredCompras = allCompras.filter(oc => {
    // Filter by status tab
    if (statusFilter === 'Pendientes' && !(oc.status === 'Borrador' || oc.status === 'Pendiente')) return false;
    if (statusFilter === 'Recibidas' && !(oc.status === 'Autorizada' || oc.status === 'Recibida')) return false;
    if (statusFilter === 'Canceladas' && oc.status !== 'Cancelada') return false;

    // Filter by search term
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const prov = proveedor(oc.providerId);
    return (
      (oc.poNumber && oc.poNumber.toLowerCase().includes(term)) ||
      (prov?.name && prov.name.toLowerCase().includes(term)) ||
      (oc.reference1 && oc.reference1.toLowerCase().includes(term)) ||
      (oc.reference2 && oc.reference2.toLowerCase().includes(term)) ||
      (oc.details && oc.details.some(d => producto(d.productId)?.name?.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="grid">
      {/* MODAL DETALLE COMPLETO DE ORDEN */}
      {viewingPo && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📦 Detalle de Orden: <span style={{ color: 'var(--primary, #d81921)' }}>{viewingPo.poNumber}</span>
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Fecha: <b>{new Date(viewingPo.date).toLocaleDateString()}</b> · Proveedor: <b>{proveedor(viewingPo.providerId)?.name || 'N/A'}</b>
                </div>
              </div>
              <button className="btn secondary small" onClick={() => setViewingPo(null)}>✕ Cerrar</button>
            </div>
            <div className="card-b" style={{ paddingTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>ESTATUS</div>
                  <span className={'chip ' + ((viewingPo.status === 'Autorizada' || viewingPo.status === 'Recibida') ? 'ok' : (viewingPo.status === 'Cancelada' ? 'danger' : 'warn'))}>
                    {viewingPo.status === 'Autorizada' ? '✅ Recibida' : viewingPo.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>REFERENCIAS</div>
                  <div style={{ fontSize: '13px' }}>Ref 1: {viewingPo.reference1 || '-'}</div>
                  <div style={{ fontSize: '13px' }}>Ref 2: {viewingPo.reference2 || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TOTAL ORDEN</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success, #16a34a)' }}>{pesos(viewingPo.totalAmount)}</div>
                </div>
              </div>

              {viewingPo.notes && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '13px' }}>
                  <b>Observaciones:</b> {viewingPo.notes}
                </div>
              )}

              <h4 style={{ margin: '12px 0 8px', fontSize: '14px', fontWeight: 700 }}>Partidas de la Orden</h4>
              <div className="table-responsive">
                <table className="table full">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Almacén</th>
                      <th>Cant.</th>
                      <th>Costo U.</th>
                      <th>IVA</th>
                      <th>Lote</th>
                      <th>Caducidad</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingPo.details || []).map(d => (
                      <tr key={d.id}>
                        <td><b>{producto(d.productId)?.name || 'Producto #' + d.productId}</b></td>
                        <td>{data.almacenes?.find(w => w.id === d.warehouseId)?.name || 'Principal'}</td>
                        <td><b>{d.quantity}</b></td>
                        <td>{pesos(d.unitCost)}</td>
                        <td>{Math.round((d.ivaRate || 0) * 100)}%</td>
                        <td>{d.batchNumber ? <span className="chip secondary" style={{ fontSize: '11px' }}>{d.batchNumber}</span> : '-'}</td>
                        <td>{d.expirationDate ? new Date(d.expirationDate).toLocaleDateString() : '-'}</td>
                        <td style={{ fontWeight: 700 }}>{pesos(d.total || (d.quantity * d.unitCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button className="btn secondary" onClick={() => setViewingPo(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO DE CREACIÓN / EDICIÓN (COLLAPSIBLE / MODAL VIEW) */}
      {showForm && (
        <div className="card double" style={{ border: '2px solid var(--success, #16a34a)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--success, #16a34a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                {editingPo ? '✏️' : '🛒'}
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#166534' }}>
                  {editingPo ? `Editar Orden de Compra: ${editingPo.poNumber}` : 'Crear Nueva Orden de Compra'}
                </h3>
                <div style={{ fontSize: '12px', color: '#15803d' }}>
                  {editingPo ? 'Modifica los proveedores, partidas o costos del borrador.' : 'Genera una orden en borrador lista para ser autorizada y recibida en almacén.'}
                </div>
              </div>
            </div>
            <button className="btn secondary small" onClick={() => { setShowForm(false); resetForm(); }}>✕ Cancelar / Cerrar</button>
          </div>
          <div className="card-b" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', minHeight: '20px' }}>
                  1. Proveedor*:
                </label>
                <SearchableSelect
                  options={data.proveedores || []}
                  value={providerId}
                  onChange={(val) => setProviderId(val)}
                  placeholder="🔍 Escribe o busca un Proveedor..."
                  getOptionLabel={(p) => p.name}
                  getOptionValue={(p) => p.id}
                  getOptionSubtext={(p) => (p.rfc ? `RFC: ${p.rfc} · Tel: ${p.phone || 'S/T'}` : `Tel: ${p.phone || 'S/T'}`)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', minHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Referencia 1 (Factura / Folio Prov.):
                </label>
                <input 
                  type="text" 
                  className="input full" 
                  placeholder="Ej. F-98421" 
                  value={reference1} 
                  onChange={e => setReference1(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', minHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Referencia 2 (Guía / Cotización):
                </label>
                <input 
                  type="text" 
                  className="input full" 
                  placeholder="Ej. GUIA-2026-X" 
                  value={reference2} 
                  onChange={e => setReference2(e.target.value)} 
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>
                  Notas / Observaciones:
                </label>
                <input 
                  type="text" 
                  className="input full" 
                  placeholder="Condiciones de entrega, observaciones adicionales, etc." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>
            </div>

            <hr style={{ margin: '1.2rem 0', borderColor: 'var(--brand-border, #eee)' }} />

            <label style={{ display: 'block', marginBottom: '8px' }}>
              <b>2. Agregar Productos al Detalle:</b>
              {selectedProduct && (
                <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'normal', color: isPerishable ? '#b45309' : '#047857' }}>
                  {isPerishable ? '⏳ Producto Perecedero (Maneja Caducidad)' : '📦 Producto General (No Perecedero)'}
                </span>
              )}
            </label>
            <form onSubmit={handleAddDetail} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.9fr 1fr', gap: '12px', alignItems: 'end', marginBottom: '1rem', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Producto*</label>
                <SearchableSelect
                  options={data.productos || []}
                  value={prodId}
                  onChange={(val) => handleProductChange(val)}
                  placeholder="🔍 Escribe nombre o SKU del producto..."
                  getOptionLabel={(p) => p.name}
                  getOptionValue={(p) => p.id}
                  getOptionSubtext={(p) => `${p.sku ? `SKU: ${p.sku} · ` : ''}Precio: $${p.price || 0}${p.isPerishable ? ' · ⏳ Perecedero' : ''}`}
                />
              </div>
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Almacén Destino*</label>
                <select className="select full" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                  <option value="">Elegir almacén...</option>
                  {data.almacenes?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Cantidad*</label>
                <input type="number" min="1" className="input full" value={cant} onChange={e => setCant(e.target.value)} placeholder="0" required />
              </div>
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Costo U. ($)*</label>
                <input type="number" step="0.01" min="0" className="input full" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" required />
              </div>
              
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>% IVA*</label>
                <select className="select full" value={ivaPercent} onChange={e => setIvaPercent(e.target.value)} required>
                  <option value="0">0% (Alimentos / Tasa Cero)</option>
                  <option value="8">8% (Estímulo Fronterizo)</option>
                  <option value="16">16% (Tasa General)</option>
                </select>
              </div>
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Lote (Opcional)</label>
                <input type="text" className="input full" placeholder="Ej. L-0482" value={lote} onChange={e => setLote(e.target.value)} />
              </div>
              {isPerishable ? (
                <div>
                  <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Caducidad*</label>
                  <input type="date" className="input full" value={caducidad} onChange={e => setCaducidad(e.target.value)} required={isPerishable} />
                </div>
              ) : null}
              <div style={{ gridColumn: isPerishable ? 'auto' : 'span 2' }}>
                <button type="submit" className="btn success full" style={{ height: '42px', fontWeight: 700 }}>
                  ➕ Añadir al Detalle
                </button>
              </div>
            </form>

            {detalles.length > 0 && (
              <div className="table-responsive" style={{ marginBottom: '1rem' }}>
                <table className="table full">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Destino</th>
                      <th>Cant.</th>
                      <th>Costo U.</th>
                      <th>% IVA</th>
                      <th>Subtotal</th>
                      <th>IVA</th>
                      <th>Total</th>
                      <th>Quitar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map(d => (
                      <tr key={d.id}>
                        <td><b>{producto(d.productoId)?.name}</b></td>
                        <td>{data.almacenes?.find(w => w.id === d.warehouseId)?.name || 'Principal'}</td>
                        <td>{d.cantidad}</td>
                        <td>{pesos(d.costo)}</td>
                        <td><span className="chip" style={{ fontSize: '0.75rem' }}>{d.ivaPercent}%</span></td>
                        <td>{pesos(d.subtotal)}</td>
                        <td>{pesos(d.taxAmount)}</td>
                        <td style={{ fontWeight: 700 }}>{pesos(d.total)}</td>
                        <td>
                          <button className="btn danger small" onClick={() => removeDetail(d.id)} title="Eliminar partida">🗑️</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td colSpan="5" style={{ textAlign: 'right' }}>Totales de la Orden:</td>
                      <td>Subtotal: {pesos(subtotalBorrador)}</td>
                      <td>IVA: {pesos(ivaBorrador)}</td>
                      <td colSpan="2" style={{ color: 'var(--success, #16a34a)', fontSize: '1.1rem', fontWeight: 800 }}>Total: {pesos(totalBorrador)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn success full" 
                onClick={handleSaveOrder} 
                disabled={loading || !providerId || detalles.length === 0} 
                style={{ padding: '0.9rem', fontSize: '1.05rem', fontWeight: 700 }}
              >
                {editingPo ? '💾 Guardar Cambios en Orden de Compra' : '✅ Guardar Orden de Compra (Borrador)'}
              </button>
              <button 
                type="button" 
                className="btn secondary" 
                onClick={() => { setShowForm(false); resetForm(); }}
                style={{ padding: '0.9rem 1.5rem', fontWeight: 600 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL PRINCIPAL DE ÓRDENES DE COMPRA (DEFAULT VIEW) */}
      <div className="card double">
        {/* Banner visual & Encabezado superior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #eef2f6', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#1e293b' }}>🛒 Órdenes de Compra y Recepción</h2>
              <span className="chip" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '11px' }}>LOGÍSTICA HT</span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              Administración de compras a proveedores, control de recepción en almacenes y cuentas por pagar.
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn success" onClick={handleStartNew} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <span>➕</span> Nueva Orden de Compra
            </button>
          </div>
        </div>

        {/* Pestañas de Filtro Rápido por Estatus */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #eef2f6', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn small ${statusFilter === 'Pendientes' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Pendientes')}
              style={{ fontWeight: statusFilter === 'Pendientes' ? 800 : 500 }}
            >
              ⏳ Pendientes de Recibir ({countPendientes})
            </button>
            <button
              className={`btn small ${statusFilter === 'Recibidas' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Recibidas')}
              style={{ fontWeight: statusFilter === 'Recibidas' ? 800 : 500 }}
            >
              ✅ Recibidas / Aplicadas ({countRecibidas})
            </button>
            <button
              className={`btn small ${statusFilter === 'Canceladas' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Canceladas')}
              style={{ fontWeight: statusFilter === 'Canceladas' ? 800 : 500 }}
            >
              🚫 Canceladas ({countCanceladas})
            </button>
            <button
              className={`btn small ${statusFilter === 'Todas' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Todas')}
              style={{ fontWeight: statusFilter === 'Todas' ? 800 : 500 }}
            >
              📋 Todas ({allCompras.length})
            </button>
          </div>

          <div style={{ flex: 1, maxWidth: '340px' }}>
            <input 
              type="text" 
              className="input full" 
              style={{ padding: '8px 12px', fontSize: '13px' }}
              placeholder="🔍 Buscar por Folio, Proveedor, Ref..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Resumen rápido de compras pendientes */}
        {statusFilter === 'Pendientes' && countPendientes > 0 && (
          <div style={{ padding: '10px 20px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#1e40af' }}>
            <div>
              📌 <b>{countPendientes} órdenes pendientes de recibir</b> por un total de <b>{pesos(totalMontoPendiente)}</b>.
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6' }}>
              Al dar click en <b>✓ Recibir</b> los productos se ingresarán inmediatamente al almacén seleccionado.
            </div>
          </div>
        )}

        <div className="card-b" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="table full" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Referencias</th>
                  <th>Subtotal / IVA</th>
                  <th>Total</th>
                  <th>Detalle Productos</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompras.map(oc => {
                  const prov = proveedor(oc.providerId);
                  const isPending = oc.status === 'Borrador' || oc.status === 'Pendiente';
                  const isReceived = oc.status === 'Autorizada' || oc.status === 'Recibida';
                  const isCancelled = oc.status === 'Cancelada';

                  return (
                    <tr key={oc.id} style={{ transition: 'background 0.15s' }}>
                      <td>
                        <b style={{ color: 'var(--primary, #d81921)', cursor: 'pointer' }} onClick={() => setViewingPo(oc)} title="Ver detalle completo">
                          {oc.poNumber}
                        </b>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>{new Date(oc.date).toLocaleDateString()}</td>
                      <td>
                        <b>{prov?.name || 'Desconocido'}</b>
                        {prov?.rfc && <div style={{ fontSize: '11px', color: '#64748b' }}>RFC: {prov.rfc}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {oc.reference1 && <div><b>Ref 1:</b> {oc.reference1}</div>}
                          {oc.reference2 && <div><b>Ref 2:</b> {oc.reference2}</div>}
                          {!oc.reference1 && !oc.reference2 && <span className="muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>Sub: {pesos(oc.subtotal || oc.totalAmount)}</div>
                          {oc.taxAmount > 0 && <div className="muted" style={{ fontSize: '11px' }}>IVA: {pesos(oc.taxAmount)}</div>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--success, #16a34a)', fontSize: '1rem' }}>
                        {pesos(oc.totalAmount)}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '240px' }}>
                          {oc.details?.slice(0, 2).map(d => (
                            <div key={d.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              • {d.quantity}x {producto(d.productId)?.name || 'Producto #' + d.productId}
                            </div>
                          ))}
                          {oc.details && oc.details.length > 2 && (
                            <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }} onClick={() => setViewingPo(oc)}>
                              +{oc.details.length - 2} productos más...
                            </div>
                          )}
                          {(!oc.details || oc.details.length === 0) && <span className="muted">Sin detalles</span>}
                        </div>
                      </td>
                      <td>
                        {isPending && <span className="chip warn" style={{ fontWeight: 700 }}>⏳ Borrador</span>}
                        {isReceived && <span className="chip ok" style={{ fontWeight: 700 }}>✅ Recibida</span>}
                        {isCancelled && <span className="chip danger" style={{ fontWeight: 700 }}>🚫 Cancelada</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                          {isPending && (
                            <>
                              <button 
                                className="btn success small" 
                                onClick={() => autorizarRecibir(oc)} 
                                disabled={loading}
                                title="Autorizar y recibir mercancía en inventario"
                                style={{ fontWeight: 700, padding: '5px 10px' }}
                              >
                                ✓ Recibir
                              </button>
                              <button 
                                className="btn secondary small" 
                                onClick={() => handleStartEdit(oc)} 
                                disabled={loading}
                                title="Editar orden de compra"
                                style={{ padding: '5px 8px' }}
                              >
                                ✏️ Editar
                              </button>
                              <button 
                                className="btn danger small" 
                                onClick={() => handleCancelOrder(oc)} 
                                disabled={loading}
                                title="Cancelar orden de compra"
                                style={{ padding: '5px 8px' }}
                              >
                                ✕ Cancelar
                              </button>
                            </>
                          )}
                          {!isPending && (
                            <button 
                              className="btn secondary small" 
                              onClick={() => setViewingPo(oc)} 
                              title="Ver detalle completo"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                            >
                              👁️ Ver Detalle
                            </button>
                          )}
                        </div>
                        {isReceived && (
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                            (Ya ingresada en almacén)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredCompras.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>No hay órdenes de compra en este estatus</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                        {statusFilter === 'Pendientes' ? 'Todas las órdenes han sido recibidas o canceladas.' : 'Prueba cambiando de filtro o término de búsqueda.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
