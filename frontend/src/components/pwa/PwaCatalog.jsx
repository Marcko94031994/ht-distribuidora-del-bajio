import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function PwaCatalog({ clients, data, cart, setCart, producto }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const getCategoryName = (p) => typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;

  const client = clients.find(c => c.id === Number(id));
  if (!client) return <div style={{padding: '20px'}}>Cliente no encontrado.</div>;

  // Filter products
  const filteredProducts = useMemo(() => {
    let prods = data.productos || [];
    
    if (activeCategory !== 'Todos') {
      prods = prods.filter(p => getCategoryName(p) === activeCategory);
    }
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      prods = prods.filter(p => 
        p.name?.toLowerCase().includes(lower) || 
        p.sku?.toLowerCase().includes(lower)
      );
    }
    
    return prods;
  }, [data.productos, activeCategory, searchTerm]);

  // Categories list
  const categories = ['Todos', ...new Set((data.productos || []).map(p => getCategoryName(p)).filter(Boolean))];

  // Helper to get effective price for client
  const getEffectivePrice = (prod) => {
    const cp = data.preciosEspeciales?.find(cp => cp.clientId === client.id && cp.productId === prod.id);
    return cp ? cp.specialPrice : prod.price;
  };

  const handleUpdateCart = (prodId, qtyChange) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === prodId);
      const currentQty = existing ? existing.quantity : 0;
      const newQty = Math.max(0, currentQty + qtyChange);
      
      const prod = producto(prodId);
      if (newQty > (prod?.availableStock || 0)) {
        alert('Stock insuficiente');
        return prev;
      }

      if (newQty === 0) {
        return prev.filter(item => item.productId !== prodId);
      }

      if (existing) {
        return prev.map(item => item.productId === prodId ? { ...item, quantity: newQty } : item);
      } else {
        return [...prev, { productId: prodId, quantity: newQty }];
      }
    });
  };

  const getQty = (prodId) => {
    return cart.find(item => item.productId === prodId)?.quantity || 0;
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalAmount = cart.reduce((sum, item) => {
    const p = producto(item.productId);
    return sum + (item.quantity * getEffectivePrice(p));
  }, 0);

  return (
    <div>
      <div className="pwa-back-header">
        <Link to={`/pwa/cliente/${client.id}`} className="pwa-back-btn">‹</Link>
        <div className="pwa-back-title">
          <div className="pwa-header-subtitle" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>{client.name}</span>
            <span style={{color: '#047857', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px'}}>
              <span style={{width: 6, height: 6, borderRadius: '50%', background: '#047857', display: 'inline-block'}}></span> En vivo
            </span>
          </div>
          <div style={{fontSize: '1.4rem', fontWeight: 900}}>Nuevo pedido</div>
        </div>
      </div>

      <div className="pwa-search-container">
        <input 
          type="text" 
          className="pwa-search-input" 
          placeholder="Buscar producto, marca o código..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="pwa-categories">
        {categories.map(cat => (
          <div 
            key={cat} 
            className={`pwa-category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </div>
        ))}
      </div>

      <div className="pwa-section-title" style={{marginTop: '20px'}}>Productos disponibles</div>

      <div className="pwa-list" style={{paddingBottom: '140px'}}>
        {filteredProducts.map(prod => {
          const qty = getQty(prod.id);
          const price = getEffectivePrice(prod);
          const stock = prod.availableStock || 0;
          const isLowStock = stock > 0 && stock <= 15;
          const isOutOfStock = stock <= 0;

          return (
            <div className="pwa-product-row" key={prod.id}>
              <div className="pwa-product-img">
                {prod.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="pwa-product-details">
                <div className="pwa-product-title">{prod.name}</div>
                <div className="pwa-product-sku">SKU {prod.sku || `PROD-${prod.id}`}</div>
                
                <div className={`pwa-product-stock ${isLowStock || isOutOfStock ? 'low' : ''}`}>
                  • {isOutOfStock ? 'Sin stock disponible' : isLowStock ? `Solo ${stock} pzas disponibles` : `${stock} pzas disponibles`}
                </div>

                <div className="pwa-product-price-row">
                  <div className="pwa-product-price">
                    ${price.toFixed(2)} <span>c/u</span>
                  </div>
                  
                  {!isOutOfStock && (
                    <div className="pwa-stepper">
                      <button className="pwa-stepper-btn" onClick={() => handleUpdateCart(prod.id, -1)} disabled={qty === 0}>−</button>
                      <div className="pwa-stepper-value">{qty}</div>
                      <button className="pwa-stepper-btn" onClick={() => handleUpdateCart(prod.id, 1)} disabled={qty >= stock}>+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div style={{textAlign: 'center', color: '#78685e', padding: '20px'}}>
            No se encontraron productos.
          </div>
        )}
      </div>

      {cartTotalItems > 0 && (
        <div className="pwa-fixed-action" style={{bottom: 0, paddingBottom: '30px', background: 'white', borderTop: '1px solid #f0ebe4', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'}}>
          <button className="pwa-btn" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}} onClick={() => navigate(`/pwa/carrito/${client.id}`)}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '10px'}}>{cartTotalItems}</span>
              Ver carrito
            </div>
            <span>${cartTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default PwaCatalog;
