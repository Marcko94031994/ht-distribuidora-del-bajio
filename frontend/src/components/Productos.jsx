import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Productos({ data, addProducto, updateProducto, almacen }) {
  const [photos, setPhotos] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  
  const [kardexData, setKardexData] = useState(null);
  const [kardexProduct, setKardexProduct] = useState(null);

  const [batchesData, setBatchesData] = useState(null);
  const [batchesProduct, setBatchesProduct] = useState(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchKardex = async (p) => {
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/product/${p.id}/kardex`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKardexData(data);
        setKardexProduct(p);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBatches = async (p) => {
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/products/${p.id}/batches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBatchesData(data);
        setBatchesProduct(p);
        setShowBatchForm(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      batchNumber: f.get('batchNumber'),
      expirationDate: f.get('expirationDate'),
      quantity: Number(f.get('quantity'))
    };

    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/products/${batchesProduct.id}/batch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Lote ingresado correctamente');
        fetchBatches(batchesProduct);
        // Desencadenar recarga global (opcional)
      } else {
        alert('Error al agregar lote');
      }
    } catch(err) {
      alert('Error de conexión');
    }
  };

  const filtered = (data.productos || []).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      sku: f.get('sku'),
      alternativeCode: f.get('alternativeCode'),
      price: Number(f.get('price')),
      price1: Number(f.get('price1')),
      price2: Number(f.get('price2')),
      price3: Number(f.get('price3')),
      price4: Number(f.get('price4')),
      price5: Number(f.get('price5')),
      cost: Number(f.get('cost')),
      cogs: Number(f.get('cogs')),
      stock: Number(f.get('stock')),
      boxPrice: Number(f.get('boxPrice')),
      unitsPerBox: Number(f.get('unitsPerBox')),
      volumePrice: Number(f.get('volumePrice')),
      weight: Number(f.get('weight')),
      unitOfMeasure: f.get('unitOfMeasure'),
      boxUnitOfMeasure: f.get('boxUnitOfMeasure'),
      currency: f.get('currency'),
      status: f.get('status'),
      isBlocked: f.get('isBlocked') === 'on',
      isPerishable: f.get('isPerishable') === 'on',
      minStock: Number(f.get('minStock') || 0),
      maxStock: Number(f.get('maxStock') || 0),
      satProductKey: f.get('satProductKey'),
      satUnitKey: f.get('satUnitKey'),
      categoryId: f.get('categoryId') ? Number(f.get('categoryId')) : null,
      brandId: f.get('brandId') ? Number(f.get('brandId')) : null,
      photos: photos
    };

    if (editingProduct) {
      updateProducto(editingProduct.id, payload);
      setEditingProduct(null);
    } else {
      addProducto(payload);
    }
    
    e.target.reset();
    setPhotos([]);
    setShowForm(false);
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setPhotos(p.images?.map(img => img.photoBase64) || []);
    setShowForm(true);
  };

  const startNew = () => {
    setEditingProduct(null);
    setPhotos([]);
    setShowForm(true);
  };

  return (
    <div>
      {kardexData && (
        <div className="modal">
          <div className="modal-content" style={{maxWidth: '800px', width: '90%'}}>
            <div className="card-h" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Kardex: {kardexProduct?.name} ({kardexProduct?.sku})</h3>
              <button className="btn muted" onClick={() => setKardexData(null)}>Cerrar</button>
            </div>
            <div className="card-b" style={{maxHeight: '60vh', overflowY: 'auto'}}>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Movimiento</th>
                      <th>Concepto</th>
                      <th>Cant.</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexData.map(k => (
                      <tr key={k.id}>
                        <td>{new Date(k.date).toLocaleString()}</td>
                        <td>
                          <span className={`chip ${k.type === 'Entrada' ? 'ok' : k.type === 'Salida' ? 'warn' : 'primary'}`}>
                            {k.type}
                          </span>
                        </td>
                        <td>{k.reason}</td>
                        <td><b>{k.type === 'Entrada' ? '+' : k.type === 'Salida' ? '-' : ''}{k.quantity}</b></td>
                        <td className="muted">{k.reference || '-'}</td>
                      </tr>
                    ))}
                    {kardexData.length === 0 && (
                      <tr><td colSpan="5" style={{textAlign: 'center'}} className="muted">No hay movimientos registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {batchesData && (
        <div className="modal">
          <div className="modal-content" style={{maxWidth: '800px', width: '90%'}}>
            <div className="card-h" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Lotes Activos: {batchesProduct?.name}</h3>
              <div>
                <button className="btn success" style={{marginRight: '10px'}} onClick={() => setShowBatchForm(!showBatchForm)}>+ Ingresar Lote</button>
                <button className="btn muted" onClick={() => setBatchesData(null)}>Cerrar</button>
              </div>
            </div>
            
            {showBatchForm && (
              <div style={{padding: '1rem', background: '#f8fafc', borderBottom: '1px solid var(--line)'}}>
                <h4>Ingresar Nuevo Lote</h4>
                <form onSubmit={handleAddBatch} style={{display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'flex-end'}}>
                  <div style={{flex: 1}}>
                    <label className="muted">Número de Lote</label>
                    <input name="batchNumber" className="input full" placeholder="Ej. LOTE-2026-X" required />
                  </div>
                  <div style={{flex: 1}}>
                    <label className="muted">Caducidad</label>
                    <input name="expirationDate" type="date" className="input full" required />
                  </div>
                  <div style={{flex: 1}}>
                    <label className="muted">Cantidad (Piezas)</label>
                    <input name="quantity" type="number" min="1" className="input full" required />
                  </div>
                  <div>
                    <button type="submit" className="btn primary">Guardar</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-b" style={{maxHeight: '60vh', overflowY: 'auto'}}>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Caducidad</th>
                      <th>Cantidad Disponible</th>
                      <th>Fecha de Ingreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchesData.map(b => {
                      const isExpiring = new Date(b.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
                      const isExpired = new Date(b.expirationDate) < new Date();
                      
                      return (
                      <tr key={b.id} style={{background: isExpired ? '#fee2e2' : isExpiring ? '#fef3c7' : 'inherit'}}>
                        <td><b>{b.batchNumber}</b></td>
                        <td>
                          {new Date(b.expirationDate).toLocaleDateString()}
                          {isExpired && <span className="chip warn" style={{marginLeft: '10px'}}>Caducado</span>}
                          {!isExpired && isExpiring && <span className="chip warn" style={{marginLeft: '10px'}}>Próximo a caducar</span>}
                        </td>
                        <td>{b.quantity}</td>
                        <td className="muted">{new Date(b.entryDate).toLocaleDateString()}</td>
                      </tr>
                    )})}
                    {batchesData.length === 0 && (
                      <tr><td colSpan="4" style={{textAlign: 'center'}} className="muted">No hay lotes activos.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm ? (
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{editingProduct ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h3>
            <button className="btn secondary" onClick={() => { setEditingProduct(null); setPhotos([]); setShowForm(false); }}>Cancelar</button>
          </div>
          <div className="card-b">
            <form onSubmit={handleSubmit} key={editingProduct?.id || 'new'} className="form-grid">
              <div className="full">
                <label className="muted" style={{ fontSize: '12px' }}>Nombre del producto (Descripción) *</label>
                <input name="name" className="input full" placeholder="Ej. Galletas Marías 170g" defaultValue={editingProduct?.name} required />
              </div>

              <div>
                <label className="muted" style={{ fontSize: '12px' }}>SKU (Clave) *</label>
                <input name="sku" className="input full" placeholder="Ej. GAL-MAR-170" defaultValue={editingProduct?.sku} required />
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Cód. Alterno / Barras</label>
                <input name="alternativeCode" className="input full" placeholder="Ej. 750100012345" defaultValue={editingProduct?.alternativeCode} />
              </div>
              
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Clasificación / Categoría</label>
                <select name="categoryId" className="select full" defaultValue={editingProduct?.categoryId || ''}>
                  <option value="">-- Seleccionar Clasificación --</option>
                  {(data.categorias || []).map(c => <option key={c.id} value={c.id}>{c.icon ? c.icon + ' ' : ''}{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Marca</label>
                <select name="brandId" className="select full" defaultValue={editingProduct?.brandId || ''}>
                  <option value="">-- Seleccionar Marca --</option>
                  {(data.marcas || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="muted" style={{ fontSize: '12px' }}>Estatus del Producto</label>
                <select name="status" className="select full" defaultValue={editingProduct?.status || 'Activo'}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Descontinuado">Descontinuado</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <input type="checkbox" name="isPerishable" id="isPerishable" defaultChecked={editingProduct?.isPerishable} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="isPerishable" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#92400e' }}>⏳ Perecedero</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                  <input type="checkbox" name="isBlocked" id="isBlocked" defaultChecked={editingProduct?.isBlocked} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="isBlocked" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#b91c1c' }}>🚫 Bloquear Venta</label>
                </div>
              </div>

                <div className="full">
                  <hr style={{margin: '12px 0 6px 0', borderColor: 'var(--line)'}}/>
                  <b>Precios y Costos</b>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Costo Base</label>
                    <input name="cost" type="number" step="0.01" className="input full" placeholder="Costo" defaultValue={editingProduct?.cost} required />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Costo Reposición</label>
                    <input name="cogs" type="number" step="0.01" className="input full" placeholder="Costo Reposición" defaultValue={editingProduct?.cogs} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Precio 1</label>
                    <input name="price1" type="number" step="0.01" className="input full" placeholder="Precio 1" defaultValue={editingProduct?.price1} required />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Precio 2</label>
                    <input name="price2" type="number" step="0.01" className="input full" placeholder="Precio 2" defaultValue={editingProduct?.price2} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Precio 3</label>
                    <input name="price3" type="number" step="0.01" className="input full" placeholder="Precio 3" defaultValue={editingProduct?.price3} />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Precio 4</label>
                    <input name="price4" type="number" step="0.01" className="input full" placeholder="Precio 4" defaultValue={editingProduct?.price4} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Precio 5</label>
                    <input name="price5" type="number" step="0.01" className="input full" placeholder="Precio 5" defaultValue={editingProduct?.price5} />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Precio Pza (Default)</label>
                    <input name="price" type="number" step="0.01" className="input full" placeholder="Precio Pza (Default)" defaultValue={editingProduct?.price} required />
                  </div>
                </div>

                <div className="full">
                  <hr style={{margin: '12px 0 6px 0', borderColor: 'var(--line)'}}/>
                  <b>Unidades, Empaque y Control de Inventario</b>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Unidad de Medida</label>
                    <input name="unitOfMeasure" className="input full" placeholder="Ej. PZA, KG, LT" defaultValue={editingProduct?.unitOfMeasure || 'PZA'} />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Unidad de Caja</label>
                    <input name="boxUnitOfMeasure" className="input full" placeholder="Ej. CJA, BTO" defaultValue={editingProduct?.boxUnitOfMeasure || 'CJA'} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Unidades por Caja (Pza * Cja)</label>
                    <input name="unitsPerBox" type="number" className="input full" placeholder="Ej. 24" defaultValue={editingProduct?.unitsPerBox || 1} required />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Peso (Kg)</label>
                    <input name="weight" type="number" step="0.01" className="input full" placeholder="Peso en Kg" defaultValue={editingProduct?.weight || 0} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>⚠️ Stock Mínimo (Alerta de Reorden)</label>
                    <input name="minStock" type="number" min="0" className="input full" placeholder="Ej. 10 (detona alerta de stock bajo)" defaultValue={editingProduct?.minStock || 0} />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>📊 Stock Máximo (Capacidad)</label>
                    <input name="maxStock" type="number" min="0" className="input full" placeholder="Ej. 100 (capacidad óptima)" defaultValue={editingProduct?.maxStock || 0} />
                  </div>
                </div>

                {!editingProduct && (
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Stock Inicial (Solo Creación)</label>
                    <input name="stock" type="number" className="input full" placeholder="0" defaultValue={editingProduct?.stock || 0} />
                  </div>
                )}

                <div className="full">
                  <hr style={{margin: '12px 0 6px 0', borderColor: 'var(--line)'}}/>
                  <b>Datos SAT y Moneda</b>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Moneda</label>
                    <input name="currency" className="input full" placeholder="Ej. MXP" defaultValue={editingProduct?.currency || 'MXP'} />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Clave Prod/Serv SAT</label>
                    <input name="satProductKey" className="input full" placeholder="Ej. 50202306" defaultValue={editingProduct?.satProductKey} />
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: '12px' }}>Clave Unidad SAT</label>
                    <input name="satUnitKey" className="input full" placeholder="Ej. H87" defaultValue={editingProduct?.satUnitKey || 'H87'} />
                  </div>
                </div>

                <div className="full" style={{ marginTop: '1rem' }}>
                  <label className="muted" style={{ fontSize: '12px', fontWeight: 600 }}>Imágenes del Producto:</label>
                  <input type="file" multiple accept="image/*" className="input full" onChange={handlePhotos} style={{ marginTop: '4px' }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {photos.map((p, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={p} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }} />
                        <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="full" style={{ marginTop: '12px' }}>
                  <button type="submit" className={`btn full ${editingProduct ? 'warn' : 'primary'}`}>
                    {editingProduct ? '💾 Actualizar Producto' : '✅ Guardar Producto'}
                  </button>
                </div>
              </form>
            </div>
        </div>
      ) : (
      <div className="card">
        <div className="card-h" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
          <h3>Catálogo de Productos</h3>
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '400px' }}>
            <input 
              type="text" 
              className="input full" 
              placeholder="🔍 Buscar SKU / Nombre..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button className="btn success" onClick={startNew}>+ Nuevo Producto</button>
          </div>
        </div>
        <div className="card-b list">
          {filtered.map(p => (
            <div 
              className="item" 
              key={p.id} 
              style={{ 
                paddingBottom: expandedId === p.id ? '1.5rem' : '14px', 
                cursor: 'pointer',
                border: expandedId === p.id ? '1.5px solid var(--primary, #0056b3)' : '1px solid var(--line, #e2e8f0)',
                boxShadow: expandedId === p.id ? '0 4px 12px rgba(0,86,179,0.08)' : 'none',
                transition: 'all 0.2s ease',
                borderRadius: '8px'
              }} 
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ width: '80px', position: 'relative' }}>
                   {p.images && p.images.length > 0 ? (
                     <img src={p.images[0].photoBase64} alt={p.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                   ) : (
                     <div style={{ width: '80px', height: '80px', background: 'var(--bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                   )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: '0.95rem' }}>{p.name} ({p.sku})</b>
                      {p.isPerishable ? (
                        <span className="chip" style={{ background: '#fffbeb', color: '#b45309', fontSize: '11px', fontWeight: 600, border: '1px solid #fde68a' }} title="Producto Perecedero (Control de Caducidad y Lote)">⏳ Perecedero</span>
                      ) : (
                        <span className="chip" style={{ background: '#f8fafc', color: '#64748b', fontSize: '11px', border: '1px solid #e2e8f0' }} title="Producto Estándar">📦 Estándar</span>
                      )}
                      {p.category && <span className="chip" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px' }}>{p.category.name}</span>}
                      {p.brand && <span className="chip" style={{ background: '#fdf4ff', color: '#86198f', fontSize: '11px' }}>{p.brand.name}</span>}
                      {p.minStock > 0 && (
                        p.availableStock <= p.minStock ? (
                          <span className="chip error" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 'bold', border: '1px solid #f87171', fontSize: '11px' }} title={`¡Alerta de Stock Bajo! Disponible (${p.availableStock}) ≤ Mínimo (${p.minStock})`}>
                            ⚠️ Stock Bajo (Mín: {p.minStock})
                          </span>
                        ) : (
                          <span className="chip" style={{ background: '#f0fdf4', color: '#15803d', fontSize: '11px', border: '1px solid #bbf7d0' }} title={`Stock Mínimo configurado: ${p.minStock}`}>
                            Mín: {p.minStock}
                          </span>
                        )
                      )}
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: expandedId === p.id ? 'var(--primary, #0056b3)' : '#e2e8f0',
                          color: expandedId === p.id ? '#ffffff' : '#334155',
                          border: '1px solid ' + (expandedId === p.id ? 'var(--primary, #0056b3)' : '#cbd5e1'),
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                        title={expandedId === p.id ? 'Click para contraer' : 'Click para ver precios, lotes y kardex'}
                      >
                        {expandedId === p.id ? '▲ Menos' : '➕ Ver más'}
                      </span>
                    </div>
                    <div>
                      {expandedId === p.id && <button className="btn secondary" style={{ marginRight: '5px', padding: '2px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); startEdit(p); }}>Editar</button>}
                      {expandedId === p.id && <button className="btn primary" style={{ marginRight: '5px', padding: '2px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); fetchBatches(p); }}>Ver Lotes</button>}
                      {expandedId === p.id && <button className="btn primary" style={{ marginRight: '5px', padding: '2px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); fetchKardex(p); }}>Ver Kardex</button>}
                      <span className="chip" style={{background: '#f1f5f9', color: '#475569', marginRight: '5px'}} title="Físico">F: {p.stock}</span>
                      <span className="chip warn" style={{marginRight: '5px'}} title="Apartado">A: {p.committedStock || 0}</span>
                      <span className="chip ok" title="Disponible">D: {p.availableStock}</span>
                    </div>
                  </div>
                  <div className="muted" style={{ marginBottom: expandedId === p.id ? '0.8rem' : '0' }}>
                    {/* Warehouse is managed via inventory grid */}
                  </div>
                  
                  {expandedId === p.id && (
                    <div style={{ marginTop: '0.8rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                        <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>P. Unidad</div>
                          <b style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>{pesos(p.price)}</b>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>P. Mayoreo</div>
                          <b style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{pesos(p.volumePrice)}</b>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>P. Caja ({p.unitsPerBox})</div>
                          <b style={{ color: 'var(--success)', fontSize: '0.8rem' }}>{pesos(p.boxPrice)}</b>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>Peso</div>
                          <b style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{p.weight || 0} Kg</b>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          <div className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>Mín / Máx</div>
                          <b style={{ color: p.minStock > 0 && p.availableStock <= p.minStock ? '#dc2626' : 'var(--text)', fontSize: '0.8rem' }}>
                            {p.minStock || 0} / {p.maxStock || '—'}
                          </b>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
