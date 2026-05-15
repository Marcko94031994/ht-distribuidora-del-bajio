import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Productos({ data, addProducto, updateProducto, almacen }) {
  const [photos, setPhotos] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

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
      price: Number(f.get('price')),
      stock: Number(f.get('stock')),
      boxPrice: Number(f.get('boxPrice')),
      unitsPerBox: Number(f.get('unitsPerBox')),
      volumePrice: Number(f.get('volumePrice')),
      warehouseId: Number(f.get('warehouseId')),
      photos: photos
    };

    if (editingProduct) {
      updateProducto(editingProduct.id, payload);
      setEditingProduct(null);
    } else {
      addProducto(payload);
    }
    
    e.currentTarget.reset();
    setPhotos([]);
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setPhotos(p.images?.map(img => img.photoBase64) || []);
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          {editingProduct && <button className="btn secondary" onClick={() => { setEditingProduct(null); setPhotos([]); }}>Cancelar</button>}
        </div>
        <div className="card-b">
          <form onSubmit={handleSubmit} key={editingProduct?.id || 'new'} className="form-grid">
            <input name="name" className="input full" placeholder="Nombre del producto" defaultValue={editingProduct?.name} required />
            <input name="sku" className="input" placeholder="SKU" defaultValue={editingProduct?.sku} required />
            <input name="price" type="number" step="0.01" className="input" placeholder="Precio (Pieza)" defaultValue={editingProduct?.price} required />
            <input name="stock" type="number" className="input" placeholder="Stock Inicial" defaultValue={editingProduct?.stock} required />
            <input name="boxPrice" type="number" step="0.01" className="input" placeholder="Precio por Caja" defaultValue={editingProduct?.boxPrice} required />
            <input name="unitsPerBox" type="number" className="input" placeholder="Unidades por Caja" defaultValue={editingProduct?.unitsPerBox} required />
            <input name="volumePrice" type="number" step="0.01" className="input" placeholder="Precio Mayorista (>10)" defaultValue={editingProduct?.volumePrice} required />
            <select name="warehouseId" className="select full" defaultValue={editingProduct?.warehouseId} required>
              <option value="">Seleccionar Almacén</option>
              {data.almacenes.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}
            </select>
            
            <div className="full" style={{ marginTop: '1rem' }}>
              <label className="muted">Imágenes del Producto:</label>
              <input type="file" multiple accept="image/*" className="input full" onChange={handlePhotos} />
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={p} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                    <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className={`btn ${editingProduct ? 'warn' : 'success'} full`}>
              {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Catálogo de Productos</h3>
          <input className="input" style={{ maxWidth: '180px', padding: '6px 12px' }} placeholder="🔍 Buscar SKU / Nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="card-b list">
          {filtered.map(p => (
            <div className="item" key={p.id} style={{ paddingBottom: expandedId === p.id ? '1.5rem' : '14px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ width: '80px' }}>
                   {p.images && p.images.length > 0 ? (
                     <img src={p.images[0].photoBase64} alt={p.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                   ) : (
                     <div style={{ width: '80px', height: '80px', background: 'var(--bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                   )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <b>{p.name} ({p.sku})</b>
                    <div>
                      {expandedId === p.id && <button className="btn secondary" style={{ marginRight: '5px', padding: '2px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); startEdit(p); }}>Editar</button>}
                      <span className="chip ok">{p.stock} pzas</span>
                    </div>
                  </div>
                  <div className="muted" style={{ marginBottom: expandedId === p.id ? '0.8rem' : '0' }}>{almacen(p.warehouseId)?.name}</div>
                  
                  {expandedId === p.id && (
                    <div style={{ marginTop: '0.8rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

