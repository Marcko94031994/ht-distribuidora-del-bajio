import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';
import LoadingOverlay from './LoadingOverlay';

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

  // EXCEL IMPORT ENGINE (ROBUST HEADER DETECTION & METADATA FILTERING)
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

        // Header detection algorithm: find row with highest multi-column match score
        const headerKeywords = [
          { words: ['sku', 'codigo', 'código', 'cod', 'codigo barr', 'codigo barras', 'código barr', 'clave', 'cve'], weight: 4, type: 'sku' },
          { words: ['descrip', 'nombre', 'producto', 'productos', 'concepto', 'articulo', 'artículo'], weight: 4, type: 'name' },
          { words: ['precio 1', 'precio1', 'menudeo', 'publico', 'público', 'esc1', 'escala 1', 'p1', 'l1', '1'], weight: 2, type: 'price1' },
          { words: ['precio 2', 'precio2', 'medio mayoreo', 'esc2', 'escala 2', 'p2', 'l2', '2'], weight: 2, type: 'price2' },
          { words: ['precio 3', 'precio3', 'mayoreo', 'esc3', 'escala 3', 'p3', 'l3', '3'], weight: 2, type: 'price3' },
          { words: ['caja', 'precio caja', 'cja', 'empaque', 'esc4'], weight: 2, type: 'boxPrice' },
          { words: ['costo', 'cost', 'compra', 'cogs'], weight: 3, type: 'cost' }
        ];

        let bestHeaderRowIndex = -1;
        let highestScore = 0;

        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r] || [];
          if (row.length === 0) continue;
          
          let score = 0;
          const matchedTypes = new Set();

          row.forEach(cell => {
            const str = String(cell || '').trim().toLowerCase();
            if (!str) return;

            headerKeywords.forEach(kw => {
              if (kw.words.some(w => str === w || str.includes(w))) {
                if (!matchedTypes.has(kw.type)) {
                  score += kw.weight;
                  matchedTypes.add(kw.type);
                }
              }
            });
          });

          if (matchedTypes.size >= 2 && score > highestScore) {
            highestScore = score;
            bestHeaderRowIndex = r;
          }
        }

        let colSku = -1;
        let colName = -1;
        let colPrice1 = -1;
        let colPrice2 = -1;
        let colPrice3 = -1;
        let colBoxPrice = -1;
        let colCost = -1;

        if (bestHeaderRowIndex !== -1) {
          const headerRow = rows[bestHeaderRowIndex].map(c => String(c || '').trim().toLowerCase());
          headerRow.forEach((h, idx) => {
            if (['sku', 'codigo', 'código', 'clave', 'cve', 'codigo barr', 'codigo barras', 'código barr'].some(k => h === k || h.includes(k))) {
              if (colSku === -1) colSku = idx;
            } else if (['descrip', 'nombre', 'producto', 'productos', 'concepto', 'articulo', 'artículo'].some(k => h === k || h.includes(k))) {
              if (colName === -1) colName = idx;
            } else if (['precio 1', 'precio1', 'menudeo', 'publico', 'público', 'esc1', 'escala 1', 'p1', 'l1', '1'].some(k => h === k || h.includes(k))) {
              if (colPrice1 === -1) colPrice1 = idx;
            } else if (['precio 2', 'precio2', 'medio mayoreo', 'esc2', 'escala 2', 'p2', 'l2', '2'].some(k => h === k || h.includes(k))) {
              if (colPrice2 === -1) colPrice2 = idx;
            } else if (['precio 3', 'precio3', 'mayoreo', 'esc3', 'escala 3', 'p3', 'l3', '3'].some(k => h === k || h.includes(k))) {
              if (colPrice3 === -1) colPrice3 = idx;
            } else if (['caja', 'precio caja', 'cja', 'empaque', 'esc4'].some(k => h === k || h.includes(k))) {
              if (colBoxPrice === -1) colBoxPrice = idx;
            } else if (['costo', 'cost', 'compra', 'cogs'].some(k => h === k || h.includes(k))) {
              if (colCost === -1) colCost = idx;
            }
          });
        } else {
          // Fallback defaults if no header row was identified
          colSku = 0;
          colName = 1;
          colPrice1 = 2;
          colPrice2 = 3;
          colPrice3 = 4;
          colBoxPrice = 5;
          colCost = 6;
        }

        const isHeaderOrMetaRow = (sku, name) => {
          const s = (sku || '').trim().toLowerCase();
          const n = (name || '').trim().toLowerCase();
          const blacklist = [
            'sku', 'codigo', 'código', 'cod', 'codigo barr', 'codigo barras', 'código barr',
            'clave', 'cve', 'producto', 'productos', 'descripcion', 'descripción',
            'concepto', 'articulo', 'artículo', 'precio', 'precios', 'costo', 'costos',
            'lista de precios', 'categoria', 'marca', 'empaque', 'ext', 'total', 'subtotal',
            'resumen', 'gran total', 'reporte'
          ];
          if (blacklist.includes(s) || blacklist.includes(n)) return true;
          if (s.startsWith('codigo barr') || s.startsWith('código barr')) return true;
          if (n.startsWith('lista de precio') || n === 'productos' || n === 'descripción' || n === 'descripcion') return true;
          return false;
        };

        const matchedList = [];
        const unmatchedList = [];
        const dbProducts = data.productos || [];
        const startIndex = bestHeaderRowIndex !== -1 ? bestHeaderRowIndex + 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawSku = colSku !== -1 ? String(row[colSku] || '').trim() : '';
          const rawName = colName !== -1 ? String(row[colName] || '').trim() : '';

          // Skip completely empty rows
          if (!rawSku && !rawName) continue;

          // Never process header-like text rows as products
          if (isHeaderOrMetaRow(rawSku, rawName)) continue;

          // Parse numeric values
          const parseVal = (val) => {
            if (val === undefined || val === null || val === '') return undefined;
            const clean = String(val).replace(/[^0-9.-]+/g, '');
            const num = parseFloat(clean);
            return isNaN(num) ? undefined : num;
          };

          const newPrice1 = colPrice1 !== -1 ? parseVal(row[colPrice1]) : undefined;
          const newPrice2 = colPrice2 !== -1 ? parseVal(row[colPrice2]) : undefined;
          const newPrice3 = colPrice3 !== -1 ? parseVal(row[colPrice3]) : undefined;
          const newBoxPrice = colBoxPrice !== -1 ? parseVal(row[colBoxPrice]) : undefined;
          const newCost = colCost !== -1 ? parseVal(row[colCost]) : undefined;

          // Skip rows with no valid sku and no valid name or no numeric data
          const hasAnyPrice = newPrice1 !== undefined || newPrice2 !== undefined || newPrice3 !== undefined || newBoxPrice !== undefined || newCost !== undefined;
          if (!rawSku && !hasAnyPrice) continue;

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
            // Only add to unmatched if it genuinely looks like an intended product
            if (rawSku || hasAnyPrice) {
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
      {/* FULL SCREEN BLOCKING OVERLAY DURING BULK SAVING OR EXCEL PROCESSING */}
      <LoadingOverlay 
        show={uploadingExcel || saving}
        title={uploadingExcel ? "Aplicando Precios Masivos..." : "Guardando Cambios de Precios..."}
        message="Actualizando catálogo y sincronizando listas de precios en tiempo real. Por favor espere."
      />

      {/* INPUT OCULTO PARA CARGA DE EXCEL */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        style={{ display: 'none' }} 
      />

      {/* MODAL PREVIA Y VALIDACIÓN DE EXCEL (UNIFIED LIGHT CORPORATE PALETTE) */}
      {showExcelModal && excelPreview && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '920px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header: Clean Light Background */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Previsualización de Lista de Precios Excel
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Archivo: <b style={{ color: '#334155' }}>{excelPreview.filename}</b> · Filas de producto leídas: <b style={{ color: '#334155' }}>{excelPreview.totalRows}</b>
                </span>
              </div>
              <button 
                className="btn secondary small" 
                onClick={() => { setShowExcelModal(false); setExcelPreview(null); }}
                style={{ padding: '6px 14px', borderRadius: '8px' }}
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="card-b" style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, background: '#f8fafc' }}>
              {/* RESUMEN DE COINCIDENCIAS UNIFICADO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#16a34a' }}>✓</span> {excelPreview.matched.length} Productos Encontrados
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                    Coinciden por SKU en el catálogo. Se actualizarán únicamente los precios que contengan valores válidos.
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {excelPreview.unmatched.length > 0 ? (
                      <>
                        <span style={{ color: '#d97706' }}>⚠️</span> {excelPreview.unmatched.length} No Encontrados
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#16a34a' }}>✓</span> 0 Omitidos
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                    {excelPreview.unmatched.length > 0 
                      ? 'Existen en el archivo pero no están dados de alta en el catálogo (serán omitidos).' 
                      : 'Todos los productos leídos existen en la base de datos.'}
                  </div>
                </div>
              </div>

              {/* LISTA DE NO ENCONTRADOS SI EXISTEN */}
              {excelPreview.unmatched.length > 0 && (
                <div style={{ marginBottom: '18px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#b45309', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <span>⚠️</span> Productos en Excel que NO existen en el Catálogo:
                  </h4>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '6px 8px' }}>SKU</th>
                          <th style={{ padding: '6px 8px' }}>Descripción</th>
                          <th style={{ padding: '6px 8px' }}>Precios leídos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelPreview.unmatched.map((u, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#334155' }}>{u.sku}</td>
                            <td style={{ padding: '6px 8px', color: '#475569' }}>{u.name}</td>
                            <td style={{ padding: '6px 8px', color: '#64748b' }}>
                              {[
                                u.prices.price1 !== undefined && `P1: ${pesos(u.prices.price1)}`,
                                u.prices.price2 !== undefined && `P2: ${pesos(u.prices.price2)}`,
                                u.prices.price3 !== undefined && `P3: ${pesos(u.prices.price3)}`,
                                u.prices.boxPrice !== undefined && `Caja: ${pesos(u.prices.boxPrice)}`,
                                u.prices.cost !== undefined && `Costo: ${pesos(u.prices.cost)}`
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
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  Previa de Precios a Aplicar ({excelPreview.matched.length} productos)
                </h4>
                <div className="table-responsive" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="table full" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ width: '120px' }}>SKU</th>
                        <th>PRODUCTO</th>
                        <th style={{ textAlign: 'right' }}>PRECIO 1</th>
                        <th style={{ textAlign: 'right' }}>PRECIO 2</th>
                        <th style={{ textAlign: 'right' }}>PRECIO 3</th>
                        <th style={{ textAlign: 'right' }}>PRECIO CAJA</th>
                        <th style={{ textAlign: 'right' }}>COSTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.matched.map(item => (
                        <tr key={item.product.id}>
                          <td><span className="chip" style={{ fontSize: '11px', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>{item.sku}</span></td>
                          <td style={{ color: '#0f172a', fontWeight: 600 }}>{item.name}</td>
                          
                          {/* P1 */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.newPrices.price1 !== undefined ? '#0f172a' : '#94a3b8' }}>
                            {item.newPrices.price1 !== undefined ? pesos(item.newPrices.price1) : '—'}
                          </td>

                          {/* P2 */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.newPrices.price2 !== undefined ? '#0f172a' : '#94a3b8' }}>
                            {item.newPrices.price2 !== undefined ? pesos(item.newPrices.price2) : '—'}
                          </td>

                          {/* P3 */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.newPrices.price3 !== undefined ? '#0f172a' : '#94a3b8' }}>
                            {item.newPrices.price3 !== undefined ? pesos(item.newPrices.price3) : '—'}
                          </td>

                          {/* Caja */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.newPrices.boxPrice !== undefined ? '#0f172a' : '#94a3b8' }}>
                            {item.newPrices.boxPrice !== undefined ? pesos(item.newPrices.boxPrice) : '—'}
                          </td>

                          {/* Costo */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.newPrices.cost !== undefined ? '#334155' : '#94a3b8' }}>
                            {item.newPrices.cost !== undefined ? pesos(item.newPrices.cost) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer: Clean and Solid */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', padding: '16px 24px', background: '#ffffff' }}>
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
                style={{ fontWeight: 800, padding: '10px 22px' }}
              >
                {uploadingExcel ? '⏳ Aplicando cambios...' : `Confirmar y Aplicar Precios (${excelPreview.matched.length} Productos)`}
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
      {!showExcelModal && (
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
      )}
    </div>
  );
}
