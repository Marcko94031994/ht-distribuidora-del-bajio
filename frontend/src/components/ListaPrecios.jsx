import React, { useState } from 'react';
import { pesos } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

// Helper to extract category name safely regardless of whether it's string or object
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
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Lista de Precios y Costos por Producto</h3>
            <span className="muted" style={{ fontSize: '12px' }}>
              Define costos promedio base y listas de precios por nivel (Menudeo, Mayoreo, Caja).
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '560px', justifyContent: 'flex-end' }}>
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
            <button 
              className={`btn ${changedCount > 0 ? 'success' : 'secondary'}`} 
              onClick={handleSaveBulk}
              disabled={saving || changedCount === 0}
              style={{ minWidth: '160px', fontWeight: 'bold' }}
            >
              {saving ? 'Guardando...' : `💾 Guardar (${changedCount})`}
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
                        {p.sku}
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
