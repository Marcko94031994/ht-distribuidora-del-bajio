import React, { useState, useMemo } from 'react';
import { pesos } from '../utils/helpers';

export default function TiendaB2B({ data, cart, setCart, addCart, enviarPedido }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0); // 0 = All

  const categories = useMemo(() => [
    { id: 0, name: 'Todos', icon: '🌟' },
    ...(data.productCategories || [])
  ], [data.productCategories]);

  const offers = useMemo(() => data.productos.filter(p => p.isPromotion && p.availableStock > 0), [data.productos]);
  const suggested = useMemo(() => data.productos.filter(p => !p.isPromotion && p.availableStock > 0).slice(0, 4), [data.productos]);

  const filteredProducts = useMemo(() => {
    return data.productos.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 0 || p.categoryId === activeCategory;
      return matchesSearch && matchesCategory && p.availableStock > 0;
    });
  }, [data.productos, search, activeCategory]);

  const totalCart = cart.reduce((sum, i) => sum + (i.unitPrice * i.cantidad), 0);

  const ProductCard = ({ p, isOffer }) => (
    <div className="kpi-card b2b-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '15px', position: 'relative', border: isOffer ? '2px solid #fbbf24' : '1px solid var(--line)' }}>
      {isOffer && <div style={{ position: 'absolute', top: '-10px', left: '10px', background: '#fbbf24', color: 'black', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900 }}>🔥 SUPER OFERTA</div>}
      <div style={{ height: '140px', background: '#f8fafc', borderRadius: '16px', marginBottom: '15px', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {p.images?.[0] ? 
          <img src={p.images[0].photoBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} /> : 
          <span style={{ fontSize: '2.5rem' }}>📦</span>
          }
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{p.name}</h4>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isOffer ? '#d97706' : 'var(--primary)' }}>
            {pesos(isOffer ? p.promotionPrice : p.price)}
          </div>
          {isOffer && <div className="muted" style={{ fontSize: '0.8rem', textDecoration: 'line-through' }}>{pesos(p.price)}</div>}
        </div>
      </div>
      <button className="btn success full" style={{ marginTop: '10px', borderRadius: '12px' }} onClick={() => addCart(p.id, 1)}>+ Agregar</button>
    </div>
  );

  return (
    <div className="b2b-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '120px' }}>
      
      {/* Search Header */}
      <div className="glass" style={{ padding: '20px 30px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Portal de Pedidos Directos</h2>
        <div style={{ position: 'relative', width: '350px' }}>
          <input 
            className="input full" 
            placeholder="🔍 Busca productos..." 
            style={{ borderRadius: '40px', padding: '10px 20px' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 🚀 Sección de OFERTAS 🔥 */}
      {offers.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>🔥 Ofertas Relámpago</h3>
            <span className="chip warn">Solo hoy</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {offers.map(p => <ProductCard key={p.id} p={p} isOffer={true} />)}
          </div>
        </section>
      )}

      {/* ✨ Sección de SUGERIDOS */}
      <section>
        <h3 style={{ marginBottom: '15px', fontSize: '1.5rem', fontWeight: 900 }}>✨ Sugeridos para tu negocio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {suggested.map(p => <ProductCard key={p.id} p={p} isOffer={false} />)}
        </div>
      </section>

      {/* Pasillos */}
      <section>
        <h3 style={{ marginBottom: '15px', fontSize: '1.5rem', fontWeight: 900 }}>🛒 Explora los Pasillos</h3>
        <div className="aisles-scroll" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px' }}>
          {categories.map(cat => (
            <div 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              style={{ 
                padding: '10px 20px', borderRadius: '25px', 
                background: activeCategory === cat.id ? 'var(--primary)' : 'white',
                color: activeCategory === cat.id ? 'white' : 'var(--text)',
                cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid var(--line)', fontWeight: 700
              }}
            >
              {cat.icon} {cat.name}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {filteredProducts.map(p => <ProductCard key={p.id} p={p} isOffer={p.isPromotion} />)}
        </div>
      </section>

      {/* Floating Cart */}
      {cart.length > 0 && (
        <div className="glass floating-cart" style={{ 
          position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', 
          width: '90%', maxWidth: '800px', padding: '15px 30px', borderRadius: '30px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-lg)', zIndex: 1000
        }}>
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>{cart.length} productos en carrito</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{pesos(totalCart)}</div>
          </div>
          <button className="btn primary" style={{ padding: '12px 40px', borderRadius: '15px' }} onClick={() => enviarPedido()}>
            Confirmar Pedido
          </button>
        </div>
      )}
    </div>
  );
}
