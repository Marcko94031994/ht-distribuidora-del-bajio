import React, { useState, useMemo, useEffect } from 'react';
import { pesos, pesosDecimals } from '../utils/helpers';
import SearchableSelect from './SearchableSelect';

export default function Almacen({
  data,
  sucursal,
  almacen,
  producto,
  proveedor,
  devoluciones,
  autorizarDevolucion,
  registrarAjuste,
  reloadState
}) {
  // Main tabs: 'kardex', 'stock', 'ajustes', 'devoluciones'
  const [activeTab, setActiveTab] = useState('kardex');

  // Kardex state
  const [kardexList, setKardexList] = useState([]);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [selectedProductKardex, setSelectedProductKardex] = useState('');
  const [filterWarehouseKardex, setFilterWarehouseKardex] = useState('');
  const [filterTypeKardex, setFilterTypeKardex] = useState('');
  const [searchKardexText, setSearchKardexText] = useState('');
  const [kardexDateFrom, setKardexDateFrom] = useState('');
  const [kardexDateTo, setKardexDateTo] = useState('');

  // Stock / Existencias state
  const [stockSearch, setStockSearch] = useState('');
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  // Form ajuste state
  const [selectedProductId, setSelectedProductId] = useState('');

  // Pagination for Kardex
  const [kardexPage, setKardexPage] = useState(1);
  const itemsPerPage = 25;

  // Fetch kardex from API
  const fetchKardex = async () => {
    setLoadingKardex(true);
    try {
      const token = localStorage.getItem('ht_token');
      const params = new URLSearchParams();
      if (selectedProductKardex) params.append('productId', selectedProductKardex);
      if (filterWarehouseKardex) params.append('warehouseId', filterWarehouseKardex);
      if (filterTypeKardex && filterTypeKardex !== 'ALL') params.append('type', filterTypeKardex);
      if (kardexDateFrom) params.append('startDate', kardexDateFrom);
      if (kardexDateTo) params.append('endDate', kardexDateTo);

      const url = `${import.meta.env.VITE_API_URL || ''}/api/app/kardex?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setKardexList(json || []);
      }
    } catch (e) {
      console.error('Error fetching kardex:', e);
    } finally {
      setLoadingKardex(false);
    }
  };

  useEffect(() => {
    fetchKardex();
  }, [selectedProductKardex, filterWarehouseKardex, filterTypeKardex, kardexDateFrom, kardexDateTo]);

  // Handler to filter Kardex by product when clicked from Stock view
  const handleOpenProductKardex = (prodId) => {
    setSelectedProductKardex(String(prodId));
    setActiveTab('kardex');
  };

  // Filtered Kardex data
  const filteredKardex = useMemo(() => {
    let list = kardexList;
    if (searchKardexText.trim()) {
      const q = searchKardexText.toLowerCase();
      list = list.filter(m => 
        (m.productSku && m.productSku.toLowerCase().includes(q)) ||
        (m.productName && m.productName.toLowerCase().includes(q)) ||
        (m.reference && m.reference.toLowerCase().includes(q)) ||
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        (m.warehouseName && m.warehouseName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [kardexList, searchKardexText]);

  // Paginated Kardex
  const paginatedKardex = useMemo(() => {
    const start = (kardexPage - 1) * itemsPerPage;
    return filteredKardex.slice(start, start + itemsPerPage);
  }, [filteredKardex, kardexPage]);

  const totalKardexPages = Math.ceil(filteredKardex.length / itemsPerPage) || 1;

  // Kardex KPIs
  const kardexKpis = useMemo(() => {
    let entradas = 0;
    let salidas = 0;
    let mermas = 0;
    filteredKardex.forEach(m => {
      if (m.type === 'Entrada') entradas += (m.quantity || 0);
      else if (m.type === 'Salida') {
        salidas += (m.quantity || 0);
        if (m.reason && m.reason.toLowerCase().includes('merma')) {
          mermas += (m.quantity || 0);
        }
      }
    });
    return { entradas, salidas, mermas, totalCount: filteredKardex.length };
  }, [filteredKardex]);

  // Flat Stock Row Data
  const stockRows = useMemo(() => {
    if (!data || !data.productos || !data.almacenes) return [];
    
    return data.productos.flatMap(p => {
      const isPerish = p.isPerishable;
      const min = p.minStock || 0;
      
      if (p.inventories && p.inventories.length > 0) {
        return p.inventories.map(inv => {
          const warehouse = data.almacenes.find(a => a.id === inv.warehouseId);
          const stock = inv.stock || 0;
          let statusText = 'Óptimo';
          let statusColor = '#15803d';
          let statusBg = '#dcfce7';

          if (stock <= 0) {
            statusText = 'Agotado';
            statusColor = '#dc2626';
            statusBg = '#fee2e2';
          } else if (min > 0 && stock <= min) {
            statusText = 'Punto Reorden';
            statusColor = '#d97706';
            statusBg = '#fef3c7';
          }

          return {
            productId: p.id,
            sku: p.sku || 'S/SKU',
            name: p.name,
            category: p.category || 'General',
            tipo: isPerish ? '⏳ Perecedero' : '📦 Estándar',
            warehouseId: inv.warehouseId,
            warehouseName: warehouse ? warehouse.name : 'General',
            minStock: min,
            stock: stock,
            statusText,
            statusColor,
            statusBg
          };
        });
      }

      // Default stock format
      const stock = p.stock || 0;
      let statusText = 'Óptimo';
      let statusColor = '#15803d';
      let statusBg = '#dcfce7';

      if (stock <= 0) {
        statusText = 'Agotado';
        statusColor = '#dc2626';
        statusBg = '#fee2e2';
      } else if (min > 0 && stock <= min) {
        statusText = 'Punto Reorden';
        statusColor = '#d97706';
        statusBg = '#fef3c7';
      }

      return [{
        productId: p.id,
        sku: p.sku || 'S/SKU',
        name: p.name,
        category: p.category || 'General',
        tipo: isPerish ? '⏳ Perecedero' : '📦 Estándar',
        warehouseId: 0,
        warehouseName: 'General',
        minStock: min,
        stock: stock,
        statusText,
        statusColor,
        statusBg
      }];
    });
  }, [data]);

  // Filtered Stock Rows
  const filteredStockRows = useMemo(() => {
    let list = stockRows;
    if (stockSearch.trim()) {
      const q = stockSearch.toLowerCase();
      list = list.filter(r => 
        (r.sku && r.sku.toLowerCase().includes(q)) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q))
      );
    }
    if (stockWarehouseFilter) {
      list = list.filter(r => String(r.warehouseId) === String(stockWarehouseFilter) || r.warehouseName === stockWarehouseFilter);
    }
    if (stockStatusFilter) {
      list = list.filter(r => r.statusText === stockStatusFilter);
    }
    return list;
  }, [stockRows, stockSearch, stockWarehouseFilter, stockStatusFilter]);

  // Export Kardex to CSV
  const exportKardexCSV = () => {
    if (!filteredKardex.length) return alert('No hay registros de Kárdex para exportar.');
    const headers = ['ID,Fecha,Tipo,Referencia,SKU,Producto,Almacen,Cantidad,Motivo'];
    const rows = filteredKardex.map(m => {
      const dateStr = m.date ? new Date(m.date).toLocaleString('es-MX') : '';
      const prodName = (m.productName || '').replace(/,/g, ' ');
      const reason = (m.reason || '').replace(/,/g, ' ');
      const ref = (m.reference || '').replace(/,/g, ' ');
      return `${m.id},"${dateStr}","${m.type}","${ref}","${m.productSku || ''}","${prodName}","${m.warehouseName || ''}",${m.quantity},"${reason}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kardex_Inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Stock to CSV
  const exportStockCSV = () => {
    if (!filteredStockRows.length) return alert('No hay existencias para exportar.');
    const headers = ['SKU,Producto,Tipo,Almacen,Stock_Minimo,Existencia_Fisica,Estatus'];
    const rows = filteredStockRows.map(r => {
      const prodName = (r.name || '').replace(/,/g, ' ');
      return `"${r.sku}","${prodName}","${r.tipo}","${r.warehouseName}",${r.minStock},${r.stock},"${r.statusText}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Existencias_Almacen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-container animate-fade-in" style={{ width: '100%', maxWidth: '100%', paddingBottom: '60px' }}>
      
      {/* 1. ENCABEZADO PRINCIPAL DE ALMACÉN Y NAVEGACIÓN DE TABS */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '22px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🏢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Control de Almacén y Kárdex Integral
              </h2>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                Trazabilidad completa de entradas, salidas, mermas, existencias físicas y cuarentena
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas / Sub-módulos */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('kardex')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              background: activeTab === 'kardex' ? '#d81921' : 'transparent',
              color: '#ffffff',
              boxShadow: activeTab === 'kardex' ? '0 4px 12px rgba(216,25,33,0.4)' : 'none'
            }}
          >
            <span>📋</span> Kárdex de Movimientos
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              background: activeTab === 'stock' ? '#d81921' : 'transparent',
              color: '#ffffff',
              boxShadow: activeTab === 'stock' ? '0 4px 12px rgba(216,25,33,0.4)' : 'none'
            }}
          >
            <span>📦</span> Existencias por Almacén
          </button>

          <button
            onClick={() => setActiveTab('ajustes')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              background: activeTab === 'ajustes' ? '#d81921' : 'transparent',
              color: '#ffffff',
              boxShadow: activeTab === 'ajustes' ? '0 4px 12px rgba(216,25,33,0.4)' : 'none'
            }}
          >
            <span>⚖️</span> Salidas / Mermas / Ajustes
          </button>

          <button
            onClick={() => setActiveTab('devoluciones')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              background: activeTab === 'devoluciones' ? '#d81921' : 'transparent',
              color: '#ffffff',
              boxShadow: activeTab === 'devoluciones' ? '0 4px 12px rgba(216,25,33,0.4)' : 'none'
            }}
          >
            <span>🔄</span> Cuarentena / Devoluciones {devoluciones?.filter(d => d.status === 'Pendiente').length > 0 && `(${devoluciones.filter(d => d.status === 'Pendiente').length})`}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: KARDEX DE MOVIMIENTOS INTEGRAL (FULL WIDTH)     */}
      {/* ======================================================== */}
      {activeTab === 'kardex' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Métricas del Kárdex */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', width: '100%' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📥</div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Entradas</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>+{kardexKpis.entradas.toLocaleString()} pzs</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📤</div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Salidas (Ventas)</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>-{kardexKpis.salidas.toLocaleString()} pzs</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🗑️</div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Mermas / Daños</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>{kardexKpis.mermas.toLocaleString()} pzs</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📜</div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Movimientos Registrados</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{kardexKpis.totalCount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Filtros del Kárdex */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end', width: '100%' }}>
              
              {/* Buscador de texto */}
              <div style={{ minWidth: '220px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  🔍 Buscar en Kárdex
                </label>
                <input
                  type="text"
                  className="input full"
                  placeholder="SKU, producto, folio, motivo..."
                  value={searchKardexText}
                  onChange={e => setSearchKardexText(e.target.value)}
                  style={{ fontSize: '13.5px', padding: '9px 12px' }}
                />
              </div>

              {/* Selector de Producto */}
              <div style={{ minWidth: '220px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  📦 Filtrar por Producto
                </label>
                <select
                  className="select full"
                  value={selectedProductKardex}
                  onChange={e => { setSelectedProductKardex(e.target.value); setKardexPage(1); }}
                  style={{ fontSize: '13.5px', padding: '9px 12px' }}
                >
                  <option value="">-- Todos los Productos --</option>
                  {(data.productos || []).map(p => (
                    <option key={p.id} value={p.id}>{p.sku ? `[${p.sku}] ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Almacén */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  🏢 Almacén
                </label>
                <select
                  className="select full"
                  value={filterWarehouseKardex}
                  onChange={e => { setFilterWarehouseKardex(e.target.value); setKardexPage(1); }}
                  style={{ fontSize: '13.5px', padding: '9px 12px' }}
                >
                  <option value="">-- Todos los Almacenes --</option>
                  {(data.almacenes || []).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Movimiento */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  🏷️ Tipo de Movimiento
                </label>
                <select
                  className="select full"
                  value={filterTypeKardex}
                  onChange={e => { setFilterTypeKardex(e.target.value); setKardexPage(1); }}
                  style={{ fontSize: '13.5px', padding: '9px 12px' }}
                >
                  <option value="">Todos los Tipos</option>
                  <option value="Entrada">📥 Entradas (Compras / Reingresos)</option>
                  <option value="Salida">📤 Salidas (Ventas / Mermas)</option>
                  <option value="Ajuste">⚖️ Ajustes de Inventario</option>
                </select>
              </div>

              {/* Rango de Fechas */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  📅 Desde
                </label>
                <input
                  type="date"
                  className="input full"
                  value={kardexDateFrom}
                  onChange={e => { setKardexDateFrom(e.target.value); setKardexPage(1); }}
                  style={{ fontSize: '13.5px', padding: '8px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  📅 Hasta
                </label>
                <input
                  type="date"
                  className="input full"
                  value={kardexDateTo}
                  onChange={e => { setKardexDateTo(e.target.value); setKardexPage(1); }}
                  style={{ fontSize: '13.5px', padding: '8px 12px' }}
                />
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn secondary"
                  onClick={() => {
                    setSelectedProductKardex('');
                    setFilterWarehouseKardex('');
                    setFilterTypeKardex('');
                    setSearchKardexText('');
                    setKardexDateFrom('');
                    setKardexDateTo('');
                    setKardexPage(1);
                  }}
                  style={{ padding: '9px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  🧹 Limpiar
                </button>
                <button
                  className="btn primary"
                  onClick={exportKardexCSV}
                  style={{ padding: '9px 16px', fontSize: '13px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  📥 Exportar CSV
                </button>
              </div>

            </div>

            {selectedProductKardex && (
              <div style={{ marginTop: '12px', padding: '8px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 600 }}>
                  🔍 Filtrando por producto: <b>{(data.productos || []).find(p => p.id === Number(selectedProductKardex))?.name || `ID ${selectedProductKardex}`}</b>
                </span>
                <button
                  onClick={() => setSelectedProductKardex('')}
                  style={{ background: 'transparent', border: 'none', color: '#1e40af', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                >
                  ✖ Quitar filtro de producto
                </button>
              </div>
            )}
          </div>

          {/* Tabla de Movimientos del Kárdex */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Libro Mayor de Movimientos (Kárdex)
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Mostrando {filteredKardex.length} movimiento(s)
                </div>
              </div>

              {loadingKardex && (
                <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600 }}>
                  🔄 Actualizando kárdex...
                </span>
              )}
            </div>

            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 14px', width: '140px' }}>Fecha y Hora</th>
                    <th style={{ padding: '12px 14px', width: '110px' }}>Tipo</th>
                    <th style={{ padding: '12px 14px', width: '130px' }}>Folio / Ref</th>
                    <th style={{ padding: '12px 14px', width: '110px' }}>SKU</th>
                    <th style={{ padding: '12px 14px' }}>Producto</th>
                    <th style={{ padding: '12px 14px', width: '130px' }}>Almacén</th>
                    <th style={{ padding: '12px 14px', width: '110px', textAlign: 'right' }}>Entrada</th>
                    <th style={{ padding: '12px 14px', width: '110px', textAlign: 'right' }}>Salida</th>
                    <th style={{ padding: '12px 14px' }}>Motivo / Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedKardex.map(m => {
                    const isEntrada = m.type === 'Entrada';
                    const isMerma = m.reason && m.reason.toLowerCase().includes('merma');
                    const isDevolucion = m.reason && m.reason.toLowerCase().includes('devol');

                    return (
                      <tr 
                        key={m.id} 
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {m.date ? new Date(m.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: isEntrada ? '#dcfce7' : (isMerma ? '#fee2e2' : (isDevolucion ? '#ede9fe' : '#fee2e2')),
                              color: isEntrada ? '#15803d' : (isMerma ? '#dc2626' : (isDevolucion ? '#6d28d9' : '#b91c1c')),
                              border: `1px solid ${isEntrada ? '#bbf7d0' : (isMerma ? '#fca5a5' : '#fecaca')}`
                            }}
                          >
                            {isEntrada ? '📥 Entrada' : (isMerma ? '🗑️ Merma' : (isDevolucion ? '🔄 Devolución' : '📤 Salida'))}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                          {m.reference || `FOL-${m.id}`}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                          {m.productSku || '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <b style={{ color: '#0f172a' }}>{m.productName}</b>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            🏢 {m.warehouseName || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>
                          {isEntrada ? `+${m.quantity}` : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>
                          {!isEntrada ? `-${m.quantity}` : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px' }}>
                          {m.reason || 'Sin observaciones'}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedKardex.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                        <div style={{ fontWeight: 600 }}>No hay movimientos de inventario que coincidan con los filtros.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalKardexPages > 1 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Página <b>{kardexPage}</b> de <b>{totalKardexPages}</b> ({filteredKardex.length} registros totales)
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn secondary"
                    disabled={kardexPage === 1}
                    onClick={() => setKardexPage(p => Math.max(1, p - 1))}
                    style={{ padding: '6px 12px', fontSize: '12.5px' }}
                  >
                    ◀ Anterior
                  </button>
                  <button
                    className="btn secondary"
                    disabled={kardexPage === totalKardexPages}
                    onClick={() => setKardexPage(p => Math.min(totalKardexPages, p + 1))}
                    style={{ padding: '6px 12px', fontSize: '12.5px' }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: EXISTENCIAS Y STOCK POR ALMACÉN (FULL WIDTH)    */}
      {/* ======================================================== */}
      {activeTab === 'stock' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Barra de Filtros de Existencias */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Buscar por SKU, Producto o Categoría..."
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                style={{ minWidth: '280px', flex: 1, fontSize: '13.5px', padding: '9px 12px' }}
              />

              <select
                className="select"
                value={stockWarehouseFilter}
                onChange={e => setStockWarehouseFilter(e.target.value)}
                style={{ fontSize: '13.5px', padding: '9px 12px', minWidth: '180px' }}
              >
                <option value="">-- Todos los Almacenes --</option>
                {(data.almacenes || []).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <select
                className="select"
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value)}
                style={{ fontSize: '13.5px', padding: '9px 12px', minWidth: '160px' }}
              >
                <option value="">-- Todos los Estatus --</option>
                <option value="Óptimo">✅ Óptimo</option>
                <option value="Punto Reorden">⚠️ Punto de Reorden</option>
                <option value="Agotado">🚫 Agotado</option>
              </select>
            </div>

            <button
              className="btn primary"
              onClick={exportStockCSV}
              style={{ padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              📥 Exportar Existencias CSV
            </button>
          </div>

          {/* Tabla de Existencias */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Existencias Físicas en Almacén
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {filteredStockRows.length} artículo(s) inventariados
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 14px', width: '130px' }}>SKU</th>
                    <th style={{ padding: '12px 14px' }}>Producto</th>
                    <th style={{ padding: '12px 14px', width: '140px' }}>Tipo</th>
                    <th style={{ padding: '12px 14px', width: '160px' }}>Almacén</th>
                    <th style={{ padding: '12px 14px', width: '110px', textAlign: 'right' }}>Stock Mínimo</th>
                    <th style={{ padding: '12px 14px', width: '140px', textAlign: 'right' }}>Físico (Existencia)</th>
                    <th style={{ padding: '12px 14px', width: '150px', textAlign: 'center' }}>Estatus Stock</th>
                    <th style={{ padding: '12px 14px', width: '150px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockRows.map((r, idx) => (
                    <tr 
                      key={`${r.productId}-${r.warehouseId}-${idx}`}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                        {r.sku}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Categoría: {r.category}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {r.tipo}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                          🏢 {r.warehouseName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                        {r.minStock} pzs
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: '15px', color: r.statusColor }}>
                        {r.stock} pzs
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span 
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: r.statusBg,
                            color: r.statusColor,
                            border: `1px solid ${r.statusColor}40`
                          }}
                        >
                          {r.statusText === 'Óptimo' ? '✅ ' : r.statusText === 'Punto Reorden' ? '⚠️ ' : '🚫 '}
                          {r.statusText}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          className="btn secondary"
                          onClick={() => handleOpenProductKardex(r.productId)}
                          style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          📋 Ver Kárdex
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredStockRows.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No se encontraron productos en almacén que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 3: AJUSTES DE INVENTARIO Y SALIDA DE MERMAS        */}
      {/* ======================================================== */}
      {activeTab === 'ajustes' && (
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚖️</span> Registro de Ajuste Físico, Merma o Muestra
              </h3>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Este movimiento descontará inventario y quedará registrado permanentemente en el Kárdex de trazabilidad.
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <form onSubmit={registrarAjuste} className="form-grid">
                <div className="full">
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Producto a Ajustar *
                  </label>
                  <SearchableSelect
                    name="productId"
                    options={data.productos || []}
                    value={selectedProductId}
                    onChange={(val) => setSelectedProductId(val)}
                    placeholder="🔍 Escribe o selecciona un Producto..."
                    getOptionLabel={(p) => p.name}
                    getOptionValue={(p) => p.id}
                    getOptionSubtext={(p) => `Existencia Físico: ${p.availableStock !== undefined ? p.availableStock : p.stock} pzs ${p.sku ? `· SKU: ${p.sku}` : ''}`}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="full">
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Motivo del Ajuste *
                    </label>
                    <select name="adjustmentType" className="select full" required style={{ padding: '10px 12px', fontSize: '14px' }}>
                      <option value="">Selecciona motivo...</option>
                      <option value="Merma">🗑️ Merma (Daño físico / Caducidad)</option>
                      <option value="Muestra">🎁 Muestra (Promoción / Degustación)</option>
                      <option value="Ajuste Conteo">⚖️ Ajuste por Conteo Físico (Faltante)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Cantidad de Piezas a Descontar *
                    </label>
                    <input 
                      name="quantity" 
                      type="number" 
                      min="1" 
                      className="input full" 
                      placeholder="Ej. 5" 
                      required 
                      style={{ padding: '10px 12px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="full">
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Justificación Detallada / Observaciones *
                  </label>
                  <textarea 
                    name="reason" 
                    className="input full" 
                    rows="3"
                    placeholder="Describe las causas de la merma o ajuste para auditoría y trazabilidad..." 
                    required 
                    style={{ fontSize: '14px', padding: '10px 12px' }}
                  ></textarea>
                </div>

                <div className="full" style={{ marginTop: '10px' }}>
                  <button type="submit" className="btn warn full" style={{ padding: '12px', fontSize: '15px', fontWeight: 800 }}>
                    ⚠️ Registrar Salida y Asentar en Kárdex
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 4: DEVOLUCIONES Y CUARENTENA (FULL WIDTH)          */}
      {/* ======================================================== */}
      {activeTab === 'devoluciones' && (
        <div style={{ width: '100%' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff1f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#be123c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span> Bandeja de Cuarentena (Devoluciones por Autorizar)
                </h3>
                <div style={{ fontSize: '12px', color: '#9f1239', marginTop: '2px' }}>
                  Evalúa la mercancía devuelta de ruta para reingresar a stock disponible o enviar a merma
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 14px' }}>Folio Pedido</th>
                    <th style={{ padding: '12px 14px' }}>Producto Devuelto</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '110px' }}>Cantidad</th>
                    <th style={{ padding: '12px 14px' }}>Razón del Cliente</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '130px' }}>Estado</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '260px' }}>Dictamen de Almacén</th>
                  </tr>
                </thead>
                <tbody>
                  {devoluciones?.filter(d => d.status === 'Pendiente').map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>
                        {(data.pedidos || []).find(p => p.id === d.orderId)?.orderNumber || `Folio #${d.orderId}`}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {producto(d.productId)?.name || `Producto #${d.productId}`}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                        {d.quantity} pzs
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {d.reason}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '12px' }}>
                          ⏳ {d.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn success" 
                            style={{ padding: '6px 12px', fontSize: '12.5px', fontWeight: 700 }}
                            onClick={() => autorizarDevolucion(d.id, false)}
                          >
                            ✅ Reingresar a Stock
                          </button>
                          <button 
                            className="btn danger" 
                            style={{ padding: '6px 12px', fontSize: '12.5px', fontWeight: 700 }}
                            onClick={() => autorizarDevolucion(d.id, true)}
                          >
                            🗑️ Mandar a Merma
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {(!devoluciones || devoluciones.filter(d => d.status === 'Pendiente').length === 0) && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                        <div style={{ fontWeight: 600 }}>No hay devoluciones pendientes de revisión en cuarentena.</div>
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

