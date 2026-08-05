import React, { useState } from 'react';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';
import LoadingOverlay from './LoadingOverlay';

export default function OrdenesCompra({ data, producto, proveedor, reloadState }) {
  // Navigation & Filtering States
  const [statusFilter, setStatusFilter] = useState('Pendientes'); // 'Pendientes' | 'Recibidas' | 'Canceladas' | 'Todas'
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [viewingPo, setViewingPo] = useState(null);
  const [receivingPo, setReceivingPo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form States (Create / Edit Draft OC)
  const [providerId, setProviderId] = useState('');
  const [reference1, setReference1] = useState('');
  const [reference2, setReference2] = useState('');
  const [notes, setNotes] = useState('');
  const [detalles, setDetalles] = useState([]);

  // Detail Entry Form (Draft OC)
  const [prodId, setProdId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [cant, setCant] = useState('');
  const [costo, setCosto] = useState('');
  const [ivaPercent, setIvaPercent] = useState('0');
  const [location, setLocation] = useState('');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');

  // Reception Modal States (Cotejo, Ajuste y Trazabilidad)
  const [receptionItems, setReceptionItems] = useState([]);
  const [receptionNotes, setReceptionNotes] = useState('');
  const [receptionRef1, setReceptionRef1] = useState('');
  const [receptionRef2, setReceptionRef2] = useState('');

  // Extra Product in Reception Modal
  const [extraProdId, setExtraProdId] = useState('');
  const [extraCustomSku, setExtraCustomSku] = useState('');
  const [extraCustomName, setExtraCustomName] = useState('');
  const [extraCant, setExtraCant] = useState('');
  const [extraCosto, setExtraCosto] = useState('');
  const [extraIva, setExtraIva] = useState('0');
  const [extraWarehouseId, setExtraWarehouseId] = useState('');
  const [extraLocation, setExtraLocation] = useState('');
  const [extraLote, setExtraLote] = useState('');
  const [extraCaducidad, setExtraCaducidad] = useState('');
  const [extraReason, setExtraReason] = useState('Producto adicional entregado físicamente por proveedor');

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
    setLocation('');
    setCant('');
    setCosto('');
    setIvaPercent('0');
    setLote('');
    setCaducidad('');
  };

  const handleStartNew = () => {
    resetForm();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      location: d.location || '',
      cantidad: d.quantity || d.orderedQuantity || 0,
      costo: d.unitCost || d.orderedUnitCost || 0,
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
    const tax = Math.round(subtotal * ivaRate * 100) / 100;
    const total = subtotal + tax;

    setDetalles([
      ...detalles, 
      {
        id: Date.now(),
        productoId: Number(prodId),
        warehouseId: Number(warehouseId),
        location: location || '',
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
    setLocation('');
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
            location: d.location,
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

  // --- RECEPTION FLOW (MODAL DE RECEPCIÓN Y AJUSTE FÍSICO) ---
  const handleOpenReception = (oc) => {
    if (oc.status !== 'Borrador' && oc.status !== 'Pendiente') {
      alert("Esta orden ya fue recibida o cancelada.");
      return;
    }
    setReceivingPo(oc);
    setReceptionRef1(oc.reference1 || '');
    setReceptionRef2(oc.reference2 || '');
    setReceptionNotes(oc.notes || '');

    // Map original items to reception items with defaults
    const items = (oc.details || []).map((d, index) => {
      const prod = producto(d.productId);
      const ordQty = d.orderedQuantity || d.quantity || 0;
      const ordCost = d.orderedUnitCost || d.unitCost || 0;
      return {
        keyId: 'item_' + (d.id || index),
        detailId: d.id,
        productId: d.productId,
        sku: prod?.sku || '',
        productName: prod?.name || `Producto #${d.productId}`,
        isPerishable: Boolean(prod?.isPerishable),
        orderedQuantity: ordQty,
        receivedQuantity: ordQty, // Default to ordered quantity
        orderedUnitCost: ordCost,
        receivedUnitCost: ordCost, // Default to ordered cost
        ivaPercent: d.ivaRate ? Math.round(d.ivaRate * 100) : (prod?.ivaRate ? Math.round(prod.ivaRate * 100) : 0),
        warehouseId: d.warehouseId || 1,
        location: d.location || '',
        batchNumber: d.batchNumber || '',
        expirationDate: d.expirationDate ? d.expirationDate.split('T')[0] : '',
        varianceReason: '',
        isAdditional: false
      };
    });
    setReceptionItems(items);

    // Reset extra item inputs
    setExtraProdId('');
    setExtraCustomSku('');
    setExtraCustomName('');
    setExtraCant('');
    setExtraCosto('');
    setExtraIva('0');
    setExtraWarehouseId(items.length > 0 ? items[0].warehouseId : (data.almacenes?.[0]?.id || 1));
    setExtraLocation('');
    setExtraLote('');
    setExtraCaducidad('');
    setExtraReason('Producto adicional físico entregado por proveedor');
  };

  const handleUpdateReceptionItem = (keyId, field, val) => {
    setReceptionItems(prev => prev.map(item => {
      if (item.keyId !== keyId) return item;
      return { ...item, [field]: val };
    }));
  };

  const handleAddExtraItem = (e) => {
    e.preventDefault();
    let prod = null;
    let targetSku = extraCustomSku.trim();
    let targetName = extraCustomName.trim();

    if (extraProdId) {
      prod = data.productos?.find(x => x.id === Number(extraProdId));
      if (prod) {
        targetSku = prod.sku || `PROD-${prod.id}`;
        targetName = prod.name;
      }
    }

    if (!targetSku && !targetName) {
      alert("Por favor selecciona un producto existente o escribe el SKU del producto nuevo.");
      return;
    }

    if (!extraCant || Number(extraCant) <= 0) {
      alert("Ingresa una cantidad válida a recibir.");
      return;
    }

    const recQty = Number(extraCant);
    const recCost = Number(extraCosto) || 0;
    const isPerish = prod ? Boolean(prod.isPerishable) : false;

    const newItem = {
      keyId: 'extra_' + Date.now(),
      detailId: 0,
      productId: prod ? prod.id : null,
      sku: targetSku,
      productName: targetName || `Producto ${targetSku}`,
      isPerishable: isPerish,
      orderedQuantity: 0,
      receivedQuantity: recQty,
      orderedUnitCost: 0,
      receivedUnitCost: recCost,
      ivaPercent: Number(extraIva) || 0,
      warehouseId: Number(extraWarehouseId) || 1,
      location: extraLocation || '',
      batchNumber: extraLote || '',
      expirationDate: extraCaducidad || '',
      varianceReason: extraReason || 'Producto adicional no contemplado en OC original',
      isAdditional: true
    };

    setReceptionItems(prev => [...prev, newItem]);

    // Reset extra form
    setExtraProdId('');
    setExtraCustomSku('');
    setExtraCustomName('');
    setExtraCant('');
    setExtraCosto('');
    setExtraIva('0');
    setExtraLocation('');
    setExtraLote('');
    setExtraCaducidad('');
  };

  const handleRemoveReceptionItem = (keyId) => {
    setReceptionItems(prev => prev.filter(i => i.keyId !== keyId));
  };

  const handleConfirmReception = async () => {
    if (!receivingPo) return;
    if (receptionItems.length === 0) {
      alert("No hay productos en la recepción. Si no va a ingresar mercancía, cancele la orden.");
      return;
    }

    // Validation for perishable products
    for (const item of receptionItems) {
      if (item.receivedQuantity > 0 && item.isPerishable && !item.expirationDate) {
        alert(`⚠️ El producto "${item.productName}" es perecedero. Por favor especifica su fecha de caducidad antes de recibir.`);
        return;
      }
      // Check if variance exists and warn
      if (item.receivedQuantity !== item.orderedQuantity && !item.varianceReason && !item.isAdditional) {
        if (!window.confirm(`El producto "${item.productName}" tiene diferencia entre lo pedido (${item.orderedQuantity}) y lo recibido (${item.receivedQuantity}) sin motivo especificado. ¿Deseas continuar?`)) {
          return;
        }
      }
    }

    const totalRecCalculated = receptionItems.reduce((sum, item) => {
      const sub = (Number(item.receivedQuantity) || 0) * (Number(item.receivedUnitCost) || 0);
      const tax = Math.round(sub * ((Number(item.ivaPercent) || 0) / 100) * 100) / 100;
      return sum + sub + tax;
    }, 0);

    if (!window.confirm(`¿Confirmar recepción de la orden ${receivingPo.poNumber} por un total real recibido de ${pesos(totalRecCalculated)}?\n\nEsto ingresará físicamente el stock en los almacenes seleccionados y afectará el saldo del proveedor.`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('ht_token');
      const payload = {
        receptionNotes: receptionNotes || null,
        reference1: receptionRef1 || null,
        reference2: receptionRef2 || null,
        items: receptionItems.map(item => ({
          detailId: item.detailId || null,
          productId: item.productId || null,
          sku: item.sku || null,
          productName: item.productName || null,
          orderedQuantity: Number(item.orderedQuantity) || 0,
          receivedQuantity: Number(item.receivedQuantity) || 0,
          orderedUnitCost: Number(item.orderedUnitCost) || 0,
          receivedUnitCost: Number(item.receivedUnitCost) || 0,
          ivaPercent: Number(item.ivaPercent) || 0,
          warehouseId: Number(item.warehouseId) || 1,
          location: item.location || null,
          batchNumber: item.batchNumber || null,
          expirationDate: item.expirationDate ? new Date(item.expirationDate).toISOString() : null,
          varianceReason: item.varianceReason || null,
          isAdditional: Boolean(item.isAdditional)
        }))
      };

      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/purchase-order/${receivingPo.id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`✅ ¡Orden ${receivingPo.poNumber} recibida con éxito en almacén!\nSe actualizó el stock físico, lotes y trazabilidad.`);
        setReceivingPo(null);
        if (reloadState) reloadState();
      } else {
        const err = await res.text();
        alert("Error al recibir orden: " + err);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al servidor");
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

  // Calculation for Reception Modal
  const totalOriginalOC = receivingPo ? (receivingPo.originalTotalAmount || receivingPo.totalAmount || 0) : 0;
  const totalRecSubtotal = receptionItems.reduce((sum, item) => sum + ((Number(item.receivedQuantity) || 0) * (Number(item.receivedUnitCost) || 0)), 0);
  const totalRecTax = receptionItems.reduce((sum, item) => {
    const sub = (Number(item.receivedQuantity) || 0) * (Number(item.receivedUnitCost) || 0);
    return sum + Math.round(sub * ((Number(item.ivaPercent) || 0) / 100) * 100) / 100;
  }, 0);
  const totalRecCalculated = totalRecSubtotal + totalRecTax;
  const diffReceptionTotal = totalRecCalculated - totalOriginalOC;

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
    if (statusFilter === 'Pendientes' && !(oc.status === 'Borrador' || oc.status === 'Pendiente')) return false;
    if (statusFilter === 'Recibidas' && !(oc.status === 'Autorizada' || oc.status === 'Recibida')) return false;
    if (statusFilter === 'Canceladas' && oc.status !== 'Cancelada') return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const prov = proveedor(oc.providerId);
    return (
      (oc.poNumber && oc.poNumber.toLowerCase().includes(term)) ||
      (prov?.name && prov.name.toLowerCase().includes(term)) ||
      (oc.reference1 && oc.reference1.toLowerCase().includes(term)) ||
      (oc.reference2 && oc.reference2.toLowerCase().includes(term)) ||
      (oc.details && oc.details.some(d => {
        const p = producto(d.productId);
        return p?.name?.toLowerCase().includes(term) || p?.sku?.toLowerCase().includes(term);
      }))
    );
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* BLOQUEO DE PANTALLA EN ACCIONES DE ORDENES DE COMPRA */}
      <LoadingOverlay 
        show={loading}
        title="Procesando Orden de Compra..."
        message="Sincronizando movimientos de inventario y estado financiero de forma segura."
      />

      {/* 1. MODAL DETALLE COMPLETO Y TRAZABILIDAD AUDITABLE DE ORDEN */}
      {viewingPo && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content" style={{ maxWidth: '1050px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Header: Clean Light Corporate */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>
                    📦 Trazabilidad y Detalle: {viewingPo.poNumber}
                  </h3>
                  <span className={'chip ' + ((viewingPo.status === 'Autorizada' || viewingPo.status === 'Recibida') ? 'ok' : (viewingPo.status === 'Cancelada' ? 'danger' : 'warn'))} style={{ fontSize: '11px', fontWeight: 700 }}>
                    {viewingPo.status === 'Autorizada' || viewingPo.status === 'Recibida' ? '✅ Recibida en Almacén' : viewingPo.status}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Generada: <b style={{ color: '#334155' }}>{new Date(viewingPo.date).toLocaleDateString()}</b> · Proveedor: <b style={{ color: '#334155' }}>{proveedor(viewingPo.providerId)?.name || 'N/A'}</b>
                </div>
              </div>
              <button className="btn secondary small" onClick={() => setViewingPo(null)}>✕ Cerrar</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Tarjetas de Resumen y Comparativa OC vs Recepción */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>MONTO ORIGINAL OC</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#334155', marginTop: '4px' }}>
                    {pesos(viewingPo.originalTotalAmount || viewingPo.totalAmount)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Presupuesto inicial pedido</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>MONTO FINAL RECIBIDO</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success, #16a34a)', marginTop: '4px' }}>
                    {pesos(viewingPo.totalAmount)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>Entrada real en inventario</div>
                </div>

                <div style={{ background: (viewingPo.originalTotalAmount && viewingPo.totalAmount !== viewingPo.originalTotalAmount) ? '#fffbeb' : '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>VARIACIÓN / DESVIACIÓN</div>
                  {viewingPo.originalTotalAmount && viewingPo.totalAmount !== viewingPo.originalTotalAmount ? (
                    <>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: viewingPo.totalAmount > viewingPo.originalTotalAmount ? '#b45309' : '#0284c7', marginTop: '4px' }}>
                        {viewingPo.totalAmount > viewingPo.originalTotalAmount ? '+' : ''}{pesos(viewingPo.totalAmount - viewingPo.originalTotalAmount)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>
                        {viewingPo.totalAmount > viewingPo.originalTotalAmount ? '⚠️ Entrada mayor a OC' : '⚠️ Entrada menor a OC'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success, #16a34a)', marginTop: '4px' }}>$0.00</div>
                      <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>✓ Coincidencia exacta</div>
                    </>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>DOCUMENTOS Y FECHAS</div>
                  <div style={{ fontSize: '12px', color: '#1e293b', marginTop: '4px' }}>
                    <b>Factura:</b> {viewingPo.reference1 || 'S/F'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e293b' }}>
                    <b>Recibida:</b> {viewingPo.receivedDate ? new Date(viewingPo.receivedDate).toLocaleDateString() : (viewingPo.status === 'Recibida' || viewingPo.status === 'Autorizada' ? 'Sí' : 'Pendiente')}
                  </div>
                </div>
              </div>

              {/* Observaciones y Notas de Recepción */}
              {(viewingPo.notes || viewingPo.receptionNotes) && (
                <div style={{ display: 'grid', gridTemplateColumns: viewingPo.notes && viewingPo.receptionNotes ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  {viewingPo.notes && (
                    <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
                      <b>📝 Notas de Compra Inicial:</b> {viewingPo.notes}
                    </div>
                  )}
                  {viewingPo.receptionNotes && (
                    <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' }}>
                      <b>📥 Observaciones al Recibir en Almacén:</b> {viewingPo.receptionNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Tabla Comparativa de Partidas (Trazabilidad OC vs Recibido) */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔍</span> Desglose de Partidas y Auditoría de Variaciones
                </h4>
                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table className="table full" style={{ margin: 0 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ minWidth: '180px' }}>SKU / Producto</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Pedido</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Recibido</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Costo OC</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Costo Real</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Total Real</th>
                        <th style={{ minWidth: '160px' }}>Destino / Ubicación</th>
                        <th style={{ minWidth: '160px' }}>Lote / Caducidad</th>
                        <th style={{ minWidth: '180px' }}>Trazabilidad / Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingPo.details || []).map(d => {
                        const prod = producto(d.productId);
                        const ordQty = d.orderedQuantity > 0 ? d.orderedQuantity : d.quantity;
                        const recQty = d.receivedQuantity !== undefined ? d.receivedQuantity : d.quantity;
                        const ordCost = d.orderedUnitCost > 0 ? d.orderedUnitCost : d.unitCost;
                        const recCost = d.receivedUnitCost > 0 ? d.receivedUnitCost : d.unitCost;
                        const qtyDiff = recQty - ordQty;
                        const costDiff = recCost - ordCost;

                        const isAdditional = Boolean(d.isAdditional) || ordQty === 0;

                        return (
                          <tr key={d.id} style={{ background: isAdditional ? '#f0fdf4' : (qtyDiff !== 0 || costDiff !== 0 ? '#fffbeb' : 'transparent') }}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                {prod?.name || 'Producto #' + d.productId}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                {prod?.sku && <span className="chip" style={{ fontSize: '10px', padding: '1px 6px' }}>SKU: {prod.sku}</span>}
                                {isAdditional && <span className="chip ok" style={{ fontSize: '10px', padding: '1px 6px' }}>🆕 Adicional</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', color: '#64748b' }}>
                              <b>{ordQty}</b>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <b style={{ color: qtyDiff < 0 ? '#dc2626' : (qtyDiff > 0 ? '#16a34a' : '#1e293b'), fontSize: '14px' }}>
                                {recQty}
                              </b>
                              {qtyDiff !== 0 && !isAdditional && (
                                <div style={{ fontSize: '10.5px', fontWeight: 700, color: qtyDiff > 0 ? '#16a34a' : '#dc2626' }}>
                                  ({qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff})
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', color: '#64748b' }}>
                              {pesos(ordCost)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              <span style={{ color: costDiff > 0 ? '#d97706' : (costDiff < 0 ? '#16a34a' : '#1e293b') }}>
                                {pesos(recCost)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success, #16a34a)' }}>
                              {pesos(d.total || (recQty * recCost * (1 + (d.ivaRate || 0))))}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <div><b>{data.almacenes?.find(w => w.id === d.warehouseId)?.name || 'Principal'}</b></div>
                              {d.location && <div style={{ color: '#0284c7', fontSize: '11px' }}>📍 {d.location}</div>}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <div>{d.batchNumber ? <span className="chip secondary" style={{ fontSize: '10.5px' }}>{d.batchNumber}</span> : <span className="muted">S/L</span>}</div>
                              {d.expirationDate && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>⏳ {new Date(d.expirationDate).toLocaleDateString()}</div>}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              {d.varianceReason ? (
                                <span style={{ color: '#b45309', fontWeight: 600, background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                  💬 {d.varianceReason}
                                </span>
                              ) : (
                                isAdditional ? (
                                  <span style={{ color: '#166534', fontSize: '11px' }}>Entregado fuera de orden</span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>✓ Conforme a OC</span>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Total final contabilizado: <b style={{ color: 'var(--success, #16a34a)', fontSize: '15px' }}>{pesos(viewingPo.totalAmount)}</b>
              </div>
              <button className="btn secondary" onClick={() => setViewingPo(null)}>Cerrar Detalle</button>
            </div>

          </div>
        </div>
      )}

      {/* 2. MODAL DE RECEPCIÓN FÍSICA, COTEJO Y AJUSTE DE ALMACÉN */}
      {receivingPo && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div className="modal-content" style={{ maxWidth: '1150px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Header: Clean Light Corporate */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  📥
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>
                    Recepción Física y Cotejo: <span style={{ color: 'var(--primary, #d81921)' }}>{receivingPo.poNumber}</span>
                  </h3>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    Proveedor: <b style={{ color: '#334155' }}>{proveedor(receivingPo.providerId)?.name || 'N/A'}</b> · Verifica cantidades recibidas, costos, lotes y ubicaciones.
                  </div>
                </div>
              </div>
              <button className="btn secondary small" onClick={() => setReceivingPo(null)}>✕ Cancelar</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Barra comparativa de Montos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>PRESUPUESTO INICIAL OC</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#334155' }}>{pesos(totalOriginalOC)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>TOTAL REAL A INGRESAR</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success, #16a34a)' }}>{pesos(totalRecCalculated)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>DIFERENCIA / DESVIACIÓN</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: diffReceptionTotal === 0 ? 'var(--success, #16a34a)' : (diffReceptionTotal > 0 ? '#b45309' : '#0284c7') }}>
                    {diffReceptionTotal > 0 ? `+${pesos(diffReceptionTotal)}` : pesos(diffReceptionTotal)}
                    {diffReceptionTotal !== 0 && <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>({diffReceptionTotal > 0 ? 'Excedente' : 'Faltante'})</span>}
                  </div>
                </div>
              </div>

              {/* Datos de Factura / Remisión y Observaciones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Factura Proveedor:
                  </label>
                  <input 
                    type="text" 
                    className="input full" 
                    placeholder="Ej. F-98421" 
                    value={receptionRef1} 
                    onChange={e => setReceptionRef1(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Remisión / Guía Transportista:
                  </label>
                  <input 
                    type="text" 
                    className="input full" 
                    placeholder="Ej. REM-2026-09" 
                    value={receptionRef2} 
                    onChange={e => setReceptionRef2(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Observaciones de Recepción / Almacén:
                  </label>
                  <input 
                    type="text" 
                    className="input full" 
                    placeholder="Sello intacto, empaque en buen estado, observaciones..." 
                    value={receptionNotes} 
                    onChange={e => setReceptionNotes(e.target.value)} 
                  />
                </div>
              </div>

              {/* Tabla de Cotejo de Partidas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                    📋 Partidas de la Orden (Ajusta lo recibido físicamente):
                  </h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Modifica cantidades o costos si hubo faltante, excedente o ajuste de precio del proveedor.
                  </span>
                </div>

                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <table className="table full" style={{ margin: 0, fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ minWidth: '170px' }}>Producto / SKU</th>
                        <th style={{ width: '75px', textAlign: 'center' }}>Pedido</th>
                        <th style={{ width: '90px' }}>Recibido*</th>
                        <th style={{ width: '100px' }}>Costo Real ($)*</th>
                        <th style={{ width: '120px' }}>Almacén</th>
                        <th style={{ width: '130px' }}>Ubicación</th>
                        <th style={{ width: '100px' }}>Lote</th>
                        <th style={{ width: '120px' }}>Caducidad</th>
                        <th style={{ minWidth: '160px' }}>Motivo Variación</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {receptionItems.map(item => {
                        const isDiff = item.receivedQuantity !== item.orderedQuantity;
                        const isCostDiff = item.receivedUnitCost !== item.orderedUnitCost;

                        return (
                          <tr key={item.keyId} style={{ background: item.isAdditional ? '#f0fdf4' : (isDiff || isCostDiff ? '#fffbeb' : 'transparent') }}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.productName}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                {item.sku && <span className="chip" style={{ fontSize: '10px', padding: '1px 6px' }}>SKU: {item.sku}</span>}
                                {item.isPerishable && <span style={{ color: '#b45309', fontWeight: 600 }}>⏳ Perecedero</span>}
                                {item.isAdditional && <span className="chip ok" style={{ fontSize: '10px', padding: '1px 6px' }}>🆕 Adicional</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', color: '#64748b' }}>
                              <b>{item.orderedQuantity}</b>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min="0" 
                                className="input full" 
                                style={{ padding: '6px 8px', fontSize: '13px', fontWeight: 700, borderColor: isDiff ? '#f59e0b' : '#cbd5e1' }}
                                value={item.receivedQuantity}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'receivedQuantity', Number(e.target.value))}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                className="input full" 
                                style={{ padding: '6px 8px', fontSize: '13px', fontWeight: 600, borderColor: isCostDiff ? '#f59e0b' : '#cbd5e1' }}
                                value={item.receivedUnitCost}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'receivedUnitCost', Number(e.target.value))}
                              />
                            </td>
                            <td>
                              <select 
                                className="select full" 
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                value={item.warehouseId}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'warehouseId', Number(e.target.value))}
                              >
                                {data.almacenes?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="input full" 
                                placeholder="Ej. Pasillo 2 Rack A" 
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                value={item.location}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'location', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="input full" 
                                placeholder="Lote" 
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                value={item.batchNumber}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'batchNumber', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="date" 
                                className="input full" 
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                value={item.expirationDate}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'expirationDate', e.target.value)}
                                required={item.isPerishable}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="input full" 
                                placeholder={isDiff || isCostDiff ? "⚠️ ¿Por qué difiere de OC?" : "Opcional"} 
                                style={{ padding: '6px 8px', fontSize: '12px', borderColor: (isDiff || isCostDiff) && !item.varianceReason ? '#f59e0b' : '#cbd5e1' }}
                                value={item.varianceReason}
                                onChange={e => handleUpdateReceptionItem(item.keyId, 'varianceReason', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.isAdditional && (
                                <button className="btn danger small" onClick={() => handleRemoveReceptionItem(item.keyId)} title="Quitar adicional" style={{ padding: '4px 8px' }}>🗑️</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección para Agregar Producto Adicional Físico (No contemplado en OC original) */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <h5 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>➕</span> ¿Llegaron productos adicionales que no venían en la OC? (O SKU nuevo):
                </h5>
                <form onSubmit={handleAddExtraItem} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.2fr auto', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Elegir del Catálogo O Escribir SKU Nuevo:
                    </label>
                    <SearchableSelect
                      options={data.productos || []}
                      value={extraProdId}
                      onChange={(val) => {
                        setExtraProdId(val);
                        if (val) {
                          const p = data.productos?.find(x => x.id === Number(val));
                          if (p) {
                            setExtraCustomSku(p.sku || '');
                            setExtraCustomName(p.name || '');
                            setExtraCosto(p.cost || p.cogs || '');
                            setExtraIva(p.ivaRate ? (p.ivaRate * 100).toString() : '0');
                          }
                        }
                      }}
                      placeholder="🔍 Buscar existente en catálogo..."
                      getOptionLabel={(p) => p.name}
                      getOptionValue={(p) => p.id}
                      getOptionSubtext={(p) => `SKU: ${p.sku || 'S/SKU'} · Costo: $${p.cost || 0}`}
                    />
                    {!extraProdId && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <input 
                          type="text" 
                          className="input full" 
                          placeholder="SKU Nuevo..." 
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                          value={extraCustomSku} 
                          onChange={e => setExtraCustomSku(e.target.value)} 
                        />
                        <input 
                          type="text" 
                          className="input full" 
                          placeholder="Descripción Producto..." 
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                          value={extraCustomName} 
                          onChange={e => setExtraCustomName(e.target.value)} 
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Cant.*</label>
                    <input 
                      type="number" 
                      min="1" 
                      className="input full" 
                      style={{ padding: '6px 8px', fontSize: '12px' }} 
                      placeholder="0" 
                      value={extraCant} 
                      onChange={e => setExtraCant(e.target.value)} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Costo U.*</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      className="input full" 
                      style={{ padding: '6px 8px', fontSize: '12px' }} 
                      placeholder="0.00" 
                      value={extraCosto} 
                      onChange={e => setExtraCosto(e.target.value)} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Almacén</label>
                    <select 
                      className="select full" 
                      style={{ padding: '6px 8px', fontSize: '12px' }} 
                      value={extraWarehouseId} 
                      onChange={e => setExtraWarehouseId(e.target.value)}
                    >
                      {data.almacenes?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Ubicación</label>
                    <input 
                      type="text" 
                      className="input full" 
                      placeholder="Pasillo / Rack" 
                      style={{ padding: '6px 8px', fontSize: '12px' }} 
                      value={extraLocation} 
                      onChange={e => setExtraLocation(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Lote / Caducidad</label>
                    <input 
                      type="text" 
                      className="input full" 
                      placeholder="Lote" 
                      style={{ padding: '6px 8px', fontSize: '12px', marginBottom: '4px' }} 
                      value={extraLote} 
                      onChange={e => setExtraLote(e.target.value)} 
                    />
                    <input 
                      type="date" 
                      className="input full" 
                      style={{ padding: '6px 8px', fontSize: '12px' }} 
                      value={extraCaducidad} 
                      onChange={e => setExtraCaducidad(e.target.value)} 
                    />
                  </div>

                  <div>
                    <button type="submit" className="btn success" style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ➕ Agregar Adicional
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Total a ingresar en inventario y CxP: </span>
                <b style={{ fontSize: '17px', color: 'var(--success, #16a34a)', marginLeft: '6px' }}>{pesos(totalRecCalculated)}</b>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn secondary" onClick={() => setReceivingPo(null)} disabled={loading}>
                  Cancelar
                </button>
                <button 
                  className="btn success" 
                  onClick={handleConfirmReception} 
                  disabled={loading || receptionItems.length === 0} 
                  style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 800 }}
                >
                  {loading ? '⏳ Procesando Entrada...' : '📥 Confirmar e Ingresar a Almacén'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. FORMULARIO DE CREACIÓN / EDICIÓN DE ORDEN DE COMPRA (BORRADOR) */}
      {showForm && (
        <div className="card" style={{ width: '100%', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                {editingPo ? '✏️' : '🛒'}
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                  {editingPo ? `Editar Orden de Compra: ${editingPo.poNumber}` : 'Crear Nueva Orden de Compra'}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
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
            <form onSubmit={handleAddDetail} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.9fr 1fr', gap: '12px', alignItems: 'end', marginBottom: '1rem', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
                <label className="muted" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', minHeight: '18px' }}>Ubicación (Opcional)</label>
                <input type="text" className="input full" placeholder="Ej. Pasillo 1" value={location} onChange={e => setLocation(e.target.value)} />
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
                      <th>Destino / Ubicación</th>
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
                        <td>
                          {data.almacenes?.find(w => w.id === d.warehouseId)?.name || 'Principal'}
                          {d.location && <span style={{ color: '#0284c7', fontSize: '11px', display: 'block' }}>📍 {d.location}</span>}
                        </td>
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

      {/* 4. HISTORIAL PRINCIPAL DE ÓRDENES DE COMPRA (DEFAULT VIEW) */}
      {!showForm && (
      <div className="card" style={{ width: '100%' }}>
        {/* Banner visual & Encabezado superior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #eef2f6', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>🛒 Órdenes de Compra y Recepción</h2>
              <span className="chip" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '11px' }}>LOGÍSTICA HT</span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Administración de compras a proveedores, control de recepción física en almacén con auditoría de variaciones y cuentas por pagar.
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn success" onClick={handleStartNew} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, padding: '10px 18px' }}>
              <span>➕</span> Nueva Orden de Compra
            </button>
          </div>
        </div>

        {/* Pestañas de Filtro Rápido por Estatus */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#f8fafc', borderBottom: '1px solid #eef2f6', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn small ${statusFilter === 'Pendientes' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Pendientes')}
              style={{ fontWeight: statusFilter === 'Pendientes' ? 800 : 600, padding: '8px 14px' }}
            >
              ⏳ Pendientes de Recibir ({countPendientes})
            </button>
            <button
              className={`btn small ${statusFilter === 'Recibidas' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Recibidas')}
              style={{ fontWeight: statusFilter === 'Recibidas' ? 800 : 600, padding: '8px 14px' }}
            >
              ✅ Recibidas / Aplicadas ({countRecibidas})
            </button>
            <button
              className={`btn small ${statusFilter === 'Canceladas' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Canceladas')}
              style={{ fontWeight: statusFilter === 'Canceladas' ? 800 : 600, padding: '8px 14px' }}
            >
              🚫 Canceladas ({countCanceladas})
            </button>
            <button
              className={`btn small ${statusFilter === 'Todas' ? 'success' : 'secondary'}`}
              onClick={() => setStatusFilter('Todas')}
              style={{ fontWeight: statusFilter === 'Todas' ? 800 : 600, padding: '8px 14px' }}
            >
              📋 Todas ({allCompras.length})
            </button>
          </div>

          <div style={{ flex: 1, minWidth: '260px', maxWidth: '380px' }}>
            <input 
              type="text" 
              className="input full" 
              style={{ padding: '8px 14px', fontSize: '13px' }}
              placeholder="🔍 Buscar por Folio, Proveedor, SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Resumen rápido de compras pendientes */}
        {statusFilter === 'Pendientes' && countPendientes > 0 && (
          <div style={{ padding: '12px 24px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#1e40af', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              📌 <b>{countPendientes} órdenes pendientes de recibir</b> por un total de <b>{pesos(totalMontoPendiente)}</b>.
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6' }}>
              Al dar click en <b>📥 Recibir</b> se abrirá el detalle para cotejar cantidades físicas, costos, lotes y justificar variaciones.
            </div>
          </div>
        )}

        <div className="card-b" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="table full" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px 18px', width: '110px' }}>Folio</th>
                  <th style={{ padding: '14px 18px', width: '110px' }}>Fecha</th>
                  <th style={{ padding: '14px 18px', minWidth: '180px' }}>Proveedor</th>
                  <th style={{ padding: '14px 18px', minWidth: '130px' }}>Referencias</th>
                  <th style={{ padding: '14px 18px', minWidth: '130px' }}>Subtotal / IVA</th>
                  <th style={{ padding: '14px 18px', minWidth: '120px' }}>Total</th>
                  <th style={{ padding: '14px 18px', minWidth: '220px' }}>Detalle Productos</th>
                  <th style={{ padding: '14px 18px', width: '130px' }}>Estado</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', width: '220px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompras.map(oc => {
                  const prov = proveedor(oc.providerId);
                  const isPending = oc.status === 'Borrador' || oc.status === 'Pendiente';
                  const isReceived = oc.status === 'Autorizada' || oc.status === 'Recibida';
                  const isCancelled = oc.status === 'Cancelada';
                  const hasVariance = oc.originalTotalAmount && oc.totalAmount !== oc.originalTotalAmount;

                  return (
                    <tr key={oc.id} style={{ transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <b style={{ color: 'var(--primary, #d81921)', cursor: 'pointer', fontSize: '14px' }} onClick={() => setViewingPo(oc)} title="Ver trazabilidad completa">
                          {oc.poNumber}
                        </b>
                        {hasVariance && (
                          <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
                            ⚠️ Variación en Entrada
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', fontSize: '13px' }}>{new Date(oc.date).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <b style={{ fontSize: '13.5px', color: '#1e293b' }}>{prov?.name || 'Desconocido'}</b>
                        {prov?.rfc && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>RFC: {prov.rfc}</div>}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {oc.reference1 && <div><b>Ref 1:</b> {oc.reference1}</div>}
                          {oc.reference2 && <div><b>Ref 2:</b> {oc.reference2}</div>}
                          {!oc.reference1 && !oc.reference2 && <span className="muted">-</span>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>Sub: {pesos(oc.subtotal || oc.totalAmount)}</div>
                          {oc.taxAmount > 0 && <div className="muted" style={{ fontSize: '11px', marginTop: '2px' }}>IVA: {pesos(oc.taxAmount)}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--success, #16a34a)', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                        {pesos(oc.totalAmount)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                          {oc.details?.slice(0, 2).map(d => {
                            const prod = producto(d.productId);
                            return (
                              <div key={d.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                • <b>{d.quantity || d.receivedQuantity}x</b> {prod?.name || 'Producto #' + d.productId}
                              </div>
                            );
                          })}
                          {oc.details && oc.details.length > 2 && (
                            <div style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600, cursor: 'pointer', marginTop: '3px' }} onClick={() => setViewingPo(oc)}>
                              +{oc.details.length - 2} productos más...
                            </div>
                          )}
                          {(!oc.details || oc.details.length === 0) && <span className="muted">Sin detalles</span>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {isPending && <span className="chip warn" style={{ fontWeight: 700 }}>⏳ Borrador</span>}
                        {isReceived && <span className="chip ok" style={{ fontWeight: 700 }}>✅ Recibida</span>}
                        {isCancelled && <span className="chip danger" style={{ fontWeight: 700 }}>🚫 Cancelada</span>}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                          {isPending && (
                            <>
                              <button 
                                className="btn success small" 
                                onClick={() => handleOpenReception(oc)} 
                                disabled={loading}
                                title="Abrir cotejo de recepción, ajustar costos, lotes o agregar productos"
                                style={{ fontWeight: 700, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>📥</span> Recibir
                              </button>
                              <button 
                                className="btn secondary small" 
                                onClick={() => handleStartEdit(oc)} 
                                disabled={loading}
                                title="Editar orden de compra"
                                style={{ padding: '6px 10px' }}
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn danger small" 
                                onClick={() => handleCancelOrder(oc)} 
                                disabled={loading}
                                title="Cancelar orden de compra"
                                style={{ padding: '6px 10px' }}
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {!isPending && (
                            <button 
                              className="btn secondary small" 
                              onClick={() => setViewingPo(oc)} 
                              title="Ver trazabilidad completa"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              👁️ Trazabilidad
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCompras.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
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
      )}
    </div>
  );
}
