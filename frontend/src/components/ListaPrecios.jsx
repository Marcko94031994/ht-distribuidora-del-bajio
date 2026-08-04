import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

// Helper to extract category name safely
const getCategoryName = (p) => {
  if (!p) return '';
  if (typeof p.category === 'object' && p.category !== null) return p.category.name || '';
  if (typeof p.category === 'string') return p.category;
  return '';
};

export default function ListaPrecios({ data, reloadState }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [updates, setUpdates] = useState({});
  const [showClientPriceModal, setShowClientPriceModal] = useState(false);
  const [selectedProductForClient, setSelectedProductForClient] = useState(null);
  const [clientPriceForm, setClientPriceForm] = useState({ clientId: '', price: '' });
  const [saving, setSaving] = useState(false);

  // Excel Upload & Preview States
  const [excelPreview, setExcelPreview] = useState(null); // { filename, matched: [], unmatched: [], totalRows: 0 }
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const fileInputRef = useRef(null);

  const categories = Array.from(
    new Set((data.productos || []).map(p => getCategoryName(p)).filter(Boolean))
  );

  const handleFieldChange = (id, field, value) => {
    const num = parseFloat(value);
    setUpdates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        [field]: isNaN(num) ? undefined : num
      }
    }));
  };

  const handleSaveBulk = async () => {
    const payload = Object.values(updates).filter(u => Object.keys(u).length > 1);
    if (payload.length === 0) return alert('No hay cambios pendientes por guardar.');

    setSaving(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/products/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('✅ Precios y costos actualizados con éxito.');
        setUpdates({});
        if (reloadState) reloadState();
      } else {
        alert('Error al guardar cambios de precios.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // EXCEL IMPORT ENGINE
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rows || rows.length === 0) {
          alert('El archivo Excel está vacío.');
          return;
        }

        // Determine if first row is header
        let startIndex = 0;
        const firstRow = rows[0].map(c => String(c).trim().toLowerCase());
        const hasHeader = firstRow.some(c => 
          c.includes('sku') || c.includes('codigo') || c.includes('código') || 
          c.includes('descripcion') || c.includes('descripción') || c.includes('producto') || 
          c.includes('precio') || c.includes('costo')
        );

        let colSku = 0;
        let colName = 1;
        let colPrice1 = 2;
        let colPrice2 = 3;
        let colPrice3 = 4;
        let colBoxPrice = 5;
        let colCost = 6;

        if (hasHeader) {
          startIndex = 1;
          firstRow.forEach((h, idx) => {
            if (h.includes('sku') || h.includes('codigo') || h.includes('código')) colSku = idx;
            else if (h.includes('descrip') || h.includes('nombre') || h.includes('producto')) colName = idx;
            else if (h.includes('precio 1') || h.includes('menudeo') || h === 'precio' || h === 'p1') colPrice1 = idx;
            else if (h.includes('precio 2') || h.includes('medio mayoreo') || h === 'p2') colPrice2 = idx;
            else if (h.includes('precio 3') || h.includes('mayoreo') || h === 'p3') colPrice3 = idx;
            else if (h.includes('caja') || h.includes('precio caja')) colBoxPrice = idx;
            else if (h.includes('costo') || h.includes('cost')) colCost = idx;
          });
        }

        const matchedList = [];
        const unmatchedList = [];
        const dbProducts = data.productos || [];

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawSku = String(row[colSku] || '').trim();
          const rawName = String(row[colName] || '').trim();

          // Skip completely empty rows
          if (!rawSku && !rawName) continue;

          // Parse numeric values if provided
          const parseVal = (val) => {
            if (val === undefined || val === null || val === '') return undefined;
            const clean = String(val).replace(/[^0-9.-]+/g, '');
            const num = parseFloat(clean);
            return isNaN(num) ? undefined : num;
          };

          const newPrice1 = parseVal(row[colPrice1]);
          const newPrice2 = parseVal(row[colPrice2]);
          const newPrice3 = parseVal(row[colPrice3]);
          const newBoxPrice = parseVal(row[colBoxPrice]);
          const newCost = parseVal(row[colCost]);

          // Match in DB
          let foundProduct = null;
          if (rawSku) {
            foundProduct = dbProducts.find(p => p.sku && p.sku.trim().toLowerCase() === rawSku.toLowerCase());
          }
          if (!foundProduct && rawName) {
            foundProduct = dbProducts.find(p => p.name && p.name.trim().toLowerCase() === rawName.toLowerCase());
          }

          if (foundProduct) {
            matchedList.push({
              product: foundProduct,
              sku: rawSku || foundProduct.sku || 'S/SKU',
              name: rawName || foundProduct.name,
              currentPrices: {
                price1: foundProduct.price || 0,
                price2: foundProduct.price2 || foundProduct.volumePrice || 0,
                price3: foundProduct.price3 || 0,
                boxPrice: foundProduct.boxPrice || 0,
                cost: foundProduct.cost || foundProduct.cogs || 0
              },
              newPrices: {
                price1: newPrice1,
                price2: newPrice2,
                price3: newPrice3,
                boxPrice: newBoxPrice,
                cost: newCost
              }
            });
          } else {
            unmatchedList.push({
              sku: rawSku || 'N/A',
              name: rawName || 'Sin descripción',
              prices: {
                price1: newPrice1,
                price2: newPrice2,
                price3: newPrice3,
                boxPrice: newBoxPrice,
                cost: newCost
              }
            });
          }
        }

        setExcelPreview({
          filename: file.name,
          matched: matchedList,
          unmatched: unmatchedList,
          totalRows: matchedList.length + unmatchedList.length
        });
        setShowExcelModal(true);

      } catch (err) {
        console.error("Error al procesar archivo Excel:", err);
        alert("Error al leer el archivo Excel. Asegúrate de que sea un archivo válido (.xlsx o .xls).");
      }
    };

    reader.readAsBinaryString(file);
    // Reset file input so user can re-select same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyExcelPrices = async () => {
    if (!excelPreview || excelPreview.matched.length === 0) return;

    setUploadingExcel(true);
    try {
      const payload = excelPreview.matched.map(item => {
        const updateObj = { id: item.product.id, sku: item.sku };
        if (item.newPrices.price1 !== undefined) updateObj.price = item.newPrices.price1;
        if (item.newPrices.price2 !== undefined) updateObj.price2 = item.newPrices.price2;
        if (item.newPrices.price3 !== undefined) updateObj.price3 = item.newPrices.price3;
        if (item.newPrices.boxPrice !== undefined) updateObj.boxPrice = item.newPrices.boxPrice;
        if (item.newPrices.cost !== undefined) updateObj.cost = item.newPrices.cost;
        return updateObj;
      });

      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/products/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`✅ Se actualizaron exitosamente las listas de precios de ${payload.length} productos.`);
        setShowExcelModal(false);
        setExcelPreview(null);
        if (reloadState) reloadState();
      } else {
        const err = await res.text();
        alert("Error al aplicar actualización masiva: " + err);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al servidor");
    } finally {
      setUploadingExcel(false);
    }
  };

  const handleExportTemplate = () => {
    const exportData = (data.productos || []).map(p => ({
      'SKU': p.sku || '',
      'Descripcion': p.name || '',
      'Precio 1 (Menudeo)': p.price !== undefined ? p.price : '',
      'Precio 2 (Medio Mayoreo)': p.price2 !== undefined ? p.price2 : '',
      'Precio 3 (Mayoreo)': p.price3 !== undefined ? p.price3 : '',
      'Precio Caja': p.boxPrice !== undefined ? p.boxPrice : '',
      'Costo': p.cost !== undefined ? p.cost : (p.cogs || '')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ListaPrecios");
    XLSX.writeFile(wb, `Plantilla_Lista_Precios_HT_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSaveClientPrice = async (e) => {
    e.preventDefault();
    if (!clientPriceForm.clientId || !selectedProductForClient) return;

    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/client-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          clientId: Number(clientPriceForm.clientId),
          productId: selectedProductForClient.id,
          specialPrice: Number(clientPriceForm.price)
        })
      });

      if (res.ok) {
        alert('✅ Precio especial para cliente asignado correctamente.');
        setShowClientPriceModal(false);
        setClientPriceForm({ clientId: '', price: '' });
        if (reloadState) reloadState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClientPrice = async (clientId, productId) => {
    if (!window.confirm('¿Deseas eliminar este precio especial asignado?')) return;
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/client-price/${clientId}/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (reloadState) reloadState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = (data.productos || []).filter(p => {
    const matchesSearch = !searchTerm || 
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const pCat = getCategoryName(p);
    const matchesCat = !categoryFilter || pCat === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const changedCount = Object.keys(updates).length;

  return (
    <div>
      {/* INPUT OCULTO PARA CARGA DE EXCEL */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        style={{ display: 'none' }} 
      />

      {/* MODAL PREVIA Y VALIDACIÓN DE EXCEL */}
      {showExcelModal && excelPreview && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Previsualización y Validación de Lista de Precios Excel
                </h3>
                <span className="muted" style={{ fontSize: '12px' }}>
                  Archivo: <b>{excelPreview.filename}</b> · Total Filas Procesadas: <b>{excelPreview.totalRows}</b>
                </span>
              </div>
              <button className="btn secondary small" onClick={() => { setShowExcelModal(false); setExcelPreview(null); }}>✕ Cerrar</button>
            </div>

            <div className="card-b" style={{ overflowY: 'auto', padding: '16px 0', flex: 1 }}>
              {/* RESUMEN DE COINCIDENCIAS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ color: '#166534', fontWeight: 800, fontSize: '18px' }}>
                    ✅ {excelPreview.matched.length} Productos Encontrados
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
                    Coinciden por SKU en el catálogo. Se actualizarán únicamente los precios que contengan valores numéricos en el archivo.
                  </div>
                </div>

                <div style={{ background: excelPreview.unmatched.length > 0 ? '#fffbeb' : '#f8fafc', border: excelPreview.unmatched.length > 0 ? '1px solid #fef3c7' : '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ color: excelPreview.unmatched.length > 0 ? '#b45309' : '#64748b', fontWeight: 800, fontSize: '18px' }}>
                    ⚠️ {excelPreview.unmatched.length} Productos No Encontrados en BD
                  </div>
                  <div style={{ fontSize: '12px', color: excelPreview.unmatched.length > 0 ? '#92400e' : '#64748b', marginTop: '4px' }}>
                    {excelPreview.unmatched.length > 0 ? 'Estos productos existen en el archivo Excel pero no están dados de alta en el catálogo (serán omitidos).' : 'Todos los productos del archivo existen en el sistema.'}
                  </div>
                </div>
              </div>

              {/* LISTA DE NO ENCONTRADOS SI EXISTEN */}
              {excelPreview.unmatched.length > 0 && (
                <div style={{ marginBottom: '18px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#9a3412', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️</span> Productos en Excel que NO existen en la Base de Datos:
                  </h4>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#7c2d12' }}>
                          <th>SKU Archivo</th>
                          <th>Descripción Archivo</th>
                          <th>Precios en Archivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelPreview.unmatched.map((u, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #ffedd5' }}>
                            <td style={{ fontWeight: 700 }}>{u.sku}</td>
                            <td>{u.name}</td>
                            <td className="muted">
                              {[
                                u.prices.price1 !== undefined && `P1: $${u.prices.price1}`,
                                u.prices.price2 !== undefined && `P2: $${u.prices.price2}`,
                                u.prices.price3 !== undefined && `P3: $${u.prices.price3}`,
                                u.prices.boxPrice !== undefined && `Caja: $${u.prices.boxPrice}`,
                                u.prices.cost !== undefined && `Costo: $${u.prices.cost}`
                              ].filter(Boolean).join(' | ') || 'Sin precio'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TABLA DE PREVIA DE ACTUALIZACIÓN */}
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700 }}>
                Previa de Cambios a Aplicar ({excelPreview.matched.length} productos)
              </h4>
              <div className="table-responsive" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className="table full">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Precio 1 (Actual ➔ Nuevo)</th>
                      <th>Precio 2 (Actual ➔ Nuevo)</th>
                      <th>Precio 3 (Actual ➔ Nuevo)</th>
                      <th>Caja (Actual ➔ Nuevo)</th>
                      <th>Costo (Actual ➔ Nuevo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelPreview.matched.map(item => (
                      <tr key={item.product.id}>
                        <td><span className="chip secondary" style={{ fontSize: '11px' }}>{item.sku}</span></td>
                        <td><b>{item.name}</b></td>
                        
                        {/* P1 */}
                        <td>
                          {item.newPrices.price1 !== undefined ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              {pesos(item.currentPrices.price1)} ➔ {pesos(item.newPrices.price1)}
                            </span>
                          ) : (
                            <span className="muted">{pesos(item.currentPrices.price1)} (Sin cambio)</span>
                          )}
                        </td>

                        {/* P2 */}
                        <td>
                          {item.newPrices.price2 !== undefined ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              {pesos(item.currentPrices.price2)} ➔ {pesos(item.newPrices.price2)}
                            </span>
                          ) : (
                            <span className="muted">{pesos(item.currentPrices.price2)} (Sin cambio)</span>
                          )}
                        </td>

                        {/* P3 */}
                        <td>
                          {item.newPrices.price3 !== undefined ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              {pesos(item.currentPrices.price3)} ➔ {pesos(item.newPrices.price3)}
                            </span>
                          ) : (
                            <span className="muted">{pesos(item.currentPrices.price3)} (Sin cambio)</span>
                          )}
                        </td>

                        {/* Caja */}
                        <td>
                          {item.newPrices.boxPrice !== undefined ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              {pesos(item.currentPrices.boxPrice)} ➔ {pesos(item.newPrices.boxPrice)}
                            </span>
                          ) : (
                            <span className="muted">{pesos(item.currentPrices.boxPrice)} (Sin cambio)</span>
                          )}
                        </td>

                        {/* Costo */}
                        <td>
                          {item.newPrices.cost !== undefined ? (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>
                              {pesos(item.currentPrices.cost)} ➔ {pesos(item.newPrices.cost)}
                            </span>
                          ) : (
                            <span className="muted">{pesos(item.currentPrices.cost)} (Sin cambio)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button 
                type="button" 
                className="btn secondary" 
                onClick={() => { setShowExcelModal(false); setExcelPreview(null); }}
                disabled={uploadingExcel}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn success" 
                onClick={handleApplyExcelPrices}
                disabled={uploadingExcel || excelPreview.matched.length === 0}
                style={{ fontWeight: 800, padding: '10px 20px' }}
              >
                {uploadingExcel ? '⏳ Aplicando cambios...' : `✅ Confirmar y Aplicar Precios (${excelPreview.matched.length} Productos)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRECIOS ESPECIALES POR CLIENTE */}
      {showClientPriceModal && selectedProductForClient && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%' }}>
            <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>🎯 Precios Especiales por Cliente: {selectedProductForClient.name}</h3>
              <button className="btn secondary" onClick={() => setShowClientPriceModal(false)}>Cerrar</button>
            </div>
            <div className="card-b">
              <form onSubmit={handleSaveClientPrice} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Seleccionar Cliente</label>
                  <SearchableSelect
                    options={data.clientes || (data.rutas || []).flatMap(r => r.clients || [])}
                    value={clientPriceForm.clientId}
                    onChange={val => setClientPriceForm({ ...clientPriceForm, clientId: val })}
                    getOptionLabel={c => `${c.name} (${c.zone || 'General'})`}
                    getOptionValue={c => c.id}
                    placeholder="Buscar cliente..."
                    required
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '12px' }}>Precio Especial ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input full"
                    placeholder="0.00"
                    value={clientPriceForm.price}
                    onChange={e => setClientPriceForm({ ...clientPriceForm, price: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn success" style={{ height: '38px' }}>+ Asignar</button>
              </form>

              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px', margin: '10px 0' }}>
                Precios Asignados a este Producto
              </h4>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Cliente</th>
                      <th style={{ padding: '8px' }}>Precio Normal</th>
                      <th style={{ padding: '8px' }}>Precio Pactado</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.preciosEspeciales || [])
                      .filter(cp => cp.productId === selectedProductForClient.id)
                      .map(cp => {
                        const clientObj = (data.clientes || []).find(c => c.id === cp.clientId) || 
                          (data.rutas || []).flatMap(r => r.clients || []).find(c => c.id === cp.clientId);
                        return (
                          <tr key={`${cp.clientId}-${cp.productId}`} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '8px' }}><b>{clientObj?.name || `Cliente #${cp.clientId}`}</b></td>
                            <td style={{ padding: '8px' }} className="muted">{pesos(selectedProductForClient.price)}</td>
                            <td style={{ padding: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>{pesos(cp.specialPrice)}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button 
                                className="btn danger" 
                                style={{ padding: '2px 8px', fontSize: '11px' }}
                                onClick={() => handleDeleteClientPrice(cp.clientId, cp.productId)}
                              >
                                ✕ Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {!(data.preciosEspeciales || []).some(cp => cp.productId === selectedProductForClient.id) && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }} className="muted">
                          No hay precios especiales configurados para este producto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PRINCIPAL DE LISTA DE PRECIOS Y COSTOS */}
      <div className="card">
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              💲 Lista de Precios y Costos por Producto
            </h3>
            <span className="muted" style={{ fontSize: '12px' }}>
              Define costos promedio y listas de precios por nivel (Menudeo, Medio Mayoreo, Mayoreo, Caja).
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              className="btn secondary small" 
              onClick={handleExportTemplate}
              title="Descargar plantilla Excel con catálogo actual de SKUs"
              style={{ fontWeight: 600 }}
            >
              📥 Descargar Plantilla Excel
            </button>
            <button 
              className="btn success small" 
              onClick={() => fileInputRef.current?.click()}
              title="Cargar archivo Excel con listas de precios y SKUs"
              style={{ fontWeight: 700 }}
            >
              📤 Cargar Lista Excel
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS Y GUARDADO MANUAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #eef2f6', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '560px' }}>
            <select 
              className="select" 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ maxWidth: '160px' }}
            >
              <option value="">Todas las Categorías</option>
              {categories.map(c => <option value={c} key={c}>{c}</option>)}
            </select>
            <input 
              type="text" 
              className="input" 
              placeholder="🔍 Buscar SKU / Nombre..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ flex: 1, minWidth: '150px' }}
            />
          </div>

          <div>
            <button 
              className={`btn ${changedCount > 0 ? 'success' : 'secondary'}`} 
              onClick={handleSaveBulk}
              disabled={saving || changedCount === 0}
              style={{ minWidth: '160px', fontWeight: 'bold' }}
            >
              {saving ? 'Guardando...' : `💾 Guardar Cambios (${changedCount})`}
            </button>
          </div>
        </div>

        <div className="card-b" style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg, #f1f5f9)', borderBottom: '2px solid var(--line, #cbd5e1)' }}>
                <th style={{ padding: '10px 12px' }}>SKU</th>
                <th style={{ padding: '10px 12px' }}>Producto</th>
                <th style={{ padding: '10px 12px', background: '#fef3c7', color: '#92400e' }}>
                  Costo Promedio (Default/Editable)
                </th>
                <th style={{ padding: '10px 12px', background: '#e0f2fe', color: '#0369a1' }}>
                  Precio 1 (Menudeo / Base)
                </th>
                <th style={{ padding: '10px 12px' }}>Precio 2 (Medio Mayoreo)</th>
                <th style={{ padding: '10px 12px' }}>Precio 3 (Mayoreo)</th>
                <th style={{ padding: '10px 12px' }}>Precio Caja ({`x Caja`})</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Margen (%)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Especiales</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const draft = updates[p.id] || {};
                const currentCost = draft.cost !== undefined ? draft.cost : (p.cost || p.cogs || 0);
                const currentPrice = draft.price !== undefined ? draft.price : (p.price || 0);
                const currentPrice2 = draft.price2 !== undefined ? draft.price2 : (p.price2 || p.volumePrice || 0);
                const currentPrice3 = draft.price3 !== undefined ? draft.price3 : (p.price3 || 0);
                const currentBoxPrice = draft.boxPrice !== undefined ? draft.boxPrice : (p.boxPrice || 0);

                // Calculate margin on base price
                const margin = currentPrice > 0 ? (((currentPrice - currentCost) / currentPrice) * 100).toFixed(1) : 0;
                const isModified = Boolean(updates[p.id]);
                const pCat = getCategoryName(p);

                return (
                  <tr 
                    key={p.id} 
                    style={{ 
                      borderBottom: '1px solid var(--line, #e2e8f0)',
                      background: isModified ? '#f0fdf4' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px' }}>
                        {p.sku || 'S/SKU'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: '240px' }}>
                      <b>{p.name}</b>
                      {pCat && <div className="muted" style={{ fontSize: '11px' }}>{pCat}</div>}
                    </td>

                    {/* COSTO PROMEDIO / BASE (EDITABLE CON DEFAULT) */}
                    <td style={{ padding: '6px 12px', background: '#fffbeb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: '95px', padding: '5px 8px', fontSize: '13px', fontWeight: 'bold', borderColor: '#fcd34d' }}
                          value={currentCost}
                          onChange={e => handleFieldChange(p.id, 'cost', e.target.value)}
                        />
                      </div>
                    </td>

                    {/* PRECIO 1 (BASE / MENUDEO) */}
                    <td style={{ padding: '6px 12px', background: '#f0f9ff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: 'bold' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: '95px', padding: '5px 8px', fontSize: '13px', fontWeight: 'bold', borderColor: '#7dd3fc' }}
                          value={currentPrice}
                          onChange={e => handleFieldChange(p.id, 'price', e.target.value)}
                        />
                      </div>
                    </td>

                    {/* PRECIO 2 (MEDIO MAYOREO) */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="muted" style={{ fontSize: '12px' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: '85px', padding: '5px 8px', fontSize: '13px' }}
                          value={currentPrice2}
                          onChange={e => handleFieldChange(p.id, 'price2', e.target.value)}
                        />
                      </div>
                    </td>

                    {/* PRECIO 3 (MAYOREO) */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="muted" style={{ fontSize: '12px' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: '85px', padding: '5px 8px', fontSize: '13px' }}
                          value={currentPrice3}
                          onChange={e => handleFieldChange(p.id, 'price3', e.target.value)}
                        />
                      </div>
                    </td>

                    {/* PRECIO POR CAJA */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="muted" style={{ fontSize: '12px' }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: '90px', padding: '5px 8px', fontSize: '13px' }}
                          value={currentBoxPrice}
                          onChange={e => handleFieldChange(p.id, 'boxPrice', e.target.value)}
                        />
                      </div>
                    </td>

                    {/* MARGEN */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span 
                        className="badge" 
                        style={{ 
                          background: margin >= 20 ? '#dcfce7' : (margin >= 10 ? '#fef3c7' : '#fee2e2'),
                          color: margin >= 20 ? '#15803d' : (margin >= 10 ? '#b45309' : '#b91c1c'),
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {margin}%
                      </span>
                    </td>

                    {/* PRECIO POR CLIENTE */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        className="btn secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          setSelectedProductForClient(p);
                          setShowClientPriceModal(true);
                        }}
                      >
                        🎯 Clientes ({(data.preciosEspeciales || []).filter(cp => cp.productId === p.id).length})
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }} className="muted">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
