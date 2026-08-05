import React, { useState, useEffect } from 'react';

export default function Mermas({ data }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProducts = (data.productos || []).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const fetchBatches = async (productId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/products/${productId}/batches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBatches(await res.json());
      } else {
        setBatches([]);
      }
    } catch (e) {
      console.error(e);
      setBatches([]);
    }
    setLoading(false);
  };

  const handleProductSelect = (p) => {
    setSelectedProduct(p);
    fetchBatches(p.id);
  };

  const handleMermaSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      productId: selectedProduct.id,
      batchId: Number(f.get('batchId')),
      quantity: Number(f.get('quantity')),
      reason: f.get('reason')
    };

    try {
      const token = localStorage.getItem('ht_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/app/merma`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Merma registrada exitosamente');
        e.target.reset();
        fetchBatches(selectedProduct.id); // Refresh
      } else {
        const error = await res.text();
        alert(`Error al registrar merma: ${error}`);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div className="card">
        <div className="card-h">
          <h3>Registrar Merma</h3>
        </div>
        <div className="card-b">
          {!selectedProduct ? (
            <div>
              <p className="muted">1. Selecciona un producto para registrar la merma</p>
              <input 
                className="input full" 
                placeholder="🔍 Buscar producto por nombre o SKU..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{marginBottom: '1rem'}}
              />
              <div style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '4px'}}>
                {filteredProducts.slice(0, 50).map(p => (
                  <div key={p.id} onClick={() => handleProductSelect(p)} style={{padding: '10px', borderBottom: '1px solid var(--line)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}} className="hover-bg">
                    <div><b>{p.name}</b> <span className="muted">({p.sku})</span></div>
                    <div className="chip ok">Stock: {p.stock}</div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div style={{padding: '10px'}} className="muted">No se encontraron productos.</div>}
              </div>
            </div>
          ) : (
            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--line)'}}>
                <div>
                  <h4>Producto Seleccionado</h4>
                  <h2>{selectedProduct.name}</h2>
                  <span className="muted">SKU: {selectedProduct.sku} | Stock Actual: {selectedProduct.stock}</span>
                </div>
                <button className="btn secondary" onClick={() => { setSelectedProduct(null); setBatches([]); }}>
                  Cambiar Producto
                </button>
              </div>

              {loading ? <p>Cargando lotes...</p> : (
                <form onSubmit={handleMermaSubmit} className="form-grid">
                  <div className="full">
                    <label className="muted">2. Selecciona el Lote Afectado</label>
                    <select name="batchId" className="select full" required>
                      <option value="">Seleccionar Lote...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batchNumber} - Disp: {b.quantity} - Caduca: {new Date(b.expirationDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    {batches.length === 0 && <p className="warn-text" style={{fontSize: '0.8rem', marginTop: '5px'}}>⚠️ Este producto no tiene lotes activos con inventario.</p>}
                  </div>
                  
                  <div>
                    <label className="muted">3. Cantidad Perdida / Dañada</label>
                    <input name="quantity" type="number" min="1" className="input full" required />
                  </div>
                  
                  <div>
                    <label className="muted">4. Motivo / Razón</label>
                    <select name="reason" className="select full" required>
                      <option value="">Seleccionar motivo...</option>
                      <option value="Caducidad">Caducidad</option>
                      <option value="Daño en Almacén (Caída/Rotura)">Daño en Almacén (Caída/Rotura)</option>
                      <option value="Humedad / Contaminación">Humedad / Contaminación</option>
                      <option value="Mermas de Transporte">Mermas de Transporte</option>
                      <option value="Robo / Extravío">Robo / Extravío</option>
                    </select>
                  </div>
                  
                  <div className="full" style={{marginTop: '1rem'}}>
                    <button type="submit" className="btn warn full" disabled={batches.length === 0}>
                      Registrar Salida por Merma
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
