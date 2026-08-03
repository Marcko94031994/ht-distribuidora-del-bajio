import React, { useState } from 'react';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

export default function OrdenesCompra({ data, producto, proveedor, reloadState }) {
  const [providerId, setProviderId] = useState('');
  const [reference1, setReference1] = useState('');
  const [reference2, setReference2] = useState('');
  const [notes, setNotes] = useState('');
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for new detail
  const [prodId, setProdId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [cant, setCant] = useState('');
  const [costo, setCosto] = useState('');
  const [ivaPercent, setIvaPercent] = useState('0');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');

  const selectedProduct = data.productos?.find(x => x.id === Number(prodId));
  const isPerishable = Boolean(selectedProduct?.isPerishable);

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

    // Reset detail form
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

  const saveDraft = async () => {
    if (!providerId) return alert("Selecciona un proveedor");
    if (detalles.length === 0) return alert("Agrega al menos un producto");

    setLoading(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/purchase-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ht_token')}`
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
        alert("✅ Orden de compra generada exitosamente en Borrador");
        setProviderId('');
        setReference1('');
        setReference2('');
        setNotes('');
        setDetalles([]);
        reloadState();
      } else {
        const errorMsg = await res.text();
        alert("Error al guardar orden: " + errorMsg);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al servidor");
    }
    setLoading(false);
  };

  const autorizarRecibir = async (oc) => {
    if(!window.confirm(`¿Estás seguro de autorizar y recibir la orden ${oc.poNumber}? Esto afectará inventarios inmediatamente.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/purchase-order/${oc.id}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ht_token')}`
        }
      });
      if (res.ok) {
        alert(`✅ Orden ${oc.poNumber} autorizada y recibida en almacén.`);
        reloadState();
      } else {
        const err = await res.text();
        alert("Error al autorizar: " + err);
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    }
    setLoading(false);
  };

  const subtotalBorrador = detalles.reduce((sum, d) => sum + (d.subtotal || (d.cantidad * d.costo)), 0);
  const ivaBorrador = detalles.reduce((sum, d) => sum + (d.taxAmount || 0), 0);
  const totalBorrador = subtotalBorrador + ivaBorrador;

  const filteredCompras = (data.compras || []).filter(oc => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const prov = proveedor(oc.providerId);
    return (
      (oc.poNumber && oc.poNumber.toLowerCase().includes(term)) ||
      (prov?.name && prov.name.toLowerCase().includes(term)) ||
      (oc.reference1 && oc.reference1.toLowerCase().includes(term)) ||
      (oc.reference2 && oc.reference2.toLowerCase().includes(term))
    );
  });

  return (
    <div className="grid">
      <div className="card double">
        <div className="card-h">
          <h3>🛒 Crear Orden de Compra (Master / Detail)</h3>
        </div>
        <div className="card-b">
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

          <hr style={{margin: '1.2rem 0', borderColor: 'var(--brand-border, #eee)'}} />

          <label style={{ display: 'block', marginBottom: '8px' }}>
            <b>2. Agregar Productos al Detalle:</b>
            {selectedProduct && (
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'normal', color: isPerishable ? '#b45309' : '#047857' }}>
                {isPerishable ? '⏳ Producto Perecedero (Maneja Caducidad)' : '📦 Producto General (No Perecedero)'}
              </span>
            )}
          </label>
          <form onSubmit={handleAddDetail} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.9fr 1fr', gap: '12px', alignItems: 'end', marginBottom: '1rem', background: 'var(--brand-bg-subtle, #f9f9f9)', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
              <select className="select full" value={warehouseId} onChange={e=>setWarehouseId(e.target.value)} required>
                <option value="">Elegir almacén...</option>
                {data.almacenes?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Cantidad*</label>
              <input type="number" min="1" className="input full" value={cant} onChange={e=>setCant(e.target.value)} placeholder="0" required />
            </div>
            <div>
              <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Costo U. ($)*</label>
              <input type="number" step="0.01" min="0" className="input full" value={costo} onChange={e=>setCosto(e.target.value)} placeholder="0.00" required />
            </div>
            
            <div>
              <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>% IVA*</label>
              <select className="select full" value={ivaPercent} onChange={e=>setIvaPercent(e.target.value)} required>
                <option value="0">0% (Alimentos / Tasa Cero)</option>
                <option value="8">8% (Estímulo Fronterizo)</option>
                <option value="16">16% (Tasa General)</option>
              </select>
            </div>
            <div>
              <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Lote (Opcional)</label>
              <input type="text" className="input full" placeholder="Ej. L-0482" value={lote} onChange={e=>setLote(e.target.value)} />
            </div>
            {isPerishable ? (
              <div>
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Caducidad*</label>
                <input type="date" className="input full" value={caducidad} onChange={e=>setCaducidad(e.target.value)} required={isPerishable} />
              </div>
            ) : null}
            <div style={{ gridColumn: isPerishable ? 'auto' : 'span 2' }}>
              <button type="submit" className="btn success full" style={{ height: '38px', fontWeight: 600 }}>Añadir ➕</button>
            </div>
          </form>

          {detalles.length > 0 && (
            <div className="table-responsive" style={{marginBottom: '1rem'}}>
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
                      <td><span className="chip" style={{fontSize: '0.75rem'}}>{d.ivaPercent}%</span></td>
                      <td>{pesos(d.subtotal)}</td>
                      <td>{pesos(d.taxAmount)}</td>
                      <td style={{fontWeight: 700}}>{pesos(d.total)}</td>
                      <td>
                        <button className="btn danger small" onClick={() => removeDetail(d.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                    <td colSpan="5" style={{textAlign: 'right'}}>Resumen de la Orden:</td>
                    <td>Subtotal: {pesos(subtotalBorrador)}</td>
                    <td>IVA: {pesos(ivaBorrador)}</td>
                    <td colSpan="2" style={{color: 'var(--brand-primary, #008060)', fontSize: '1.05rem'}}>Total: {pesos(totalBorrador)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button className="btn primary full" onClick={saveDraft} disabled={loading || !providerId || detalles.length === 0} style={{padding: '0.9rem', fontSize: '1.05rem', fontWeight: 700}}>
            💾 Guardar Orden de Compra (Borrador)
          </button>
        </div>
      </div>

      <div className="card double">
        <div className="card-h" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
          <h3>📋 Historial de Órdenes de Compra</h3>
          <div style={{ flex: 1, maxWidth: '380px' }}>
            <input 
              type="text" 
              className="input full" 
              placeholder="🔍 Buscar por Folio, Proveedor o Referencia..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="card-b">
          <div className="table-responsive">
            <table className="table full">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Referencias</th>
                  <th>Subtotal / IVA</th>
                  <th>Total</th>
                  <th>Detalles</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompras.map(oc => {
                  const prov = proveedor(oc.providerId);
                  return (
                    <tr key={oc.id}>
                      <td><b>{oc.poNumber}</b></td>
                      <td>{new Date(oc.date).toLocaleDateString()}</td>
                      <td>{prov?.name || 'Desconocido'}</td>
                      <td>
                        <div style={{fontSize: '0.8rem', color: '#666'}}>
                          {oc.reference1 && <div><b>Ref 1:</b> {oc.reference1}</div>}
                          {oc.reference2 && <div><b>Ref 2:</b> {oc.reference2}</div>}
                          {!oc.reference1 && !oc.reference2 && <span className="muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{fontSize: '0.85rem'}}>
                          <div>Sub: {pesos(oc.subtotal || oc.totalAmount)}</div>
                          {oc.taxAmount > 0 && <div className="muted">IVA: {pesos(oc.taxAmount)}</div>}
                        </div>
                      </td>
                      <td style={{fontWeight: 800, color: 'var(--brand-primary, #008060)'}}>{pesos(oc.totalAmount)}</td>
                      <td>
                        <div style={{fontSize: '0.85rem', color: '#555'}}>
                          {oc.details?.map(d => (
                            <div key={d.id}>• {d.quantity}x {producto(d.productId)?.name} ({pesos(d.unitCost || 0)})</div>
                          ))}
                          {(!oc.details || oc.details.length === 0) && <span className="muted">Sin detalles</span>}
                        </div>
                      </td>
                      <td>
                        <span className={'chip '+(oc.status==='Borrador'?'warn':'ok')}>{oc.status}</span>
                      </td>
                      <td>
                        {oc.status === 'Borrador' && (
                          <button className="btn success small" onClick={() => autorizarRecibir(oc)} disabled={loading}>
                            ✓ Recibir
                          </button>
                        )}
                        {oc.status !== 'Borrador' && <span className="muted" style={{fontSize: '0.85rem'}}>✓ Recibida</span>}
                      </td>
                    </tr>
                  )
                })}
                {filteredCompras.length === 0 && (
                  <tr><td colSpan="9" className="muted" style={{textAlign: 'center', padding: '20px'}}>No hay órdenes de compra registradas o que coincidan con la búsqueda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
