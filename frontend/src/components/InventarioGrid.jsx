import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function InventarioGrid({ data }) {
  const [gridApi, setGridApi] = useState(null);

  const onGridReady = (params) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  };

  const rowData = useMemo(() => {
    if (!data || !data.productos || !data.almacenes) return [];
    
    return data.productos.flatMap(p => {
      const isPerish = p.isPerishable;
      const min = p.minStock || 0;
      
      const warehouses = data.almacenes && data.almacenes.length > 0 ? data.almacenes : [{ id: 0, name: 'General' }];
      
      return warehouses.map(a => {
        const inv = p.inventories?.find(i => i.warehouseId === a.id);
        const stock = inv ? (inv.stock || 0) : (a.id === 0 ? (p.stock || 0) : 0);
        
        return {
          id: `${p.id}-${a.id}`,
          sku: p.sku,
          producto: p.name,
          tipo: isPerish ? '⏳ Perecedero' : '📦 Estándar',
          almacen: a.name,
          minStock: min,
          existencia: stock,
          alerta: (min > 0 && stock <= min) ? (stock <= 0 ? '🚫 Agotado' : '⚠️ Reorden') : '✅ Óptimo'
        };
      });
    });
  }, [data]);

  const columnDefs = useMemo(() => [
    { field: 'sku', headerName: 'SKU', width: 110, filter: 'agTextColumnFilter', sortable: true },
    { field: 'producto', headerName: 'Producto', flex: 1, filter: 'agTextColumnFilter', sortable: true },
    { field: 'tipo', headerName: 'Tipo', width: 130, filter: 'agTextColumnFilter', sortable: true },
    { field: 'almacen', headerName: 'Almacén', width: 160, filter: 'agTextColumnFilter', sortable: true },
    { field: 'minStock', headerName: 'Mínimo', width: 100, type: 'numericColumn', filter: 'agNumberColumnFilter', sortable: true },
    { 
      field: 'existencia', 
      headerName: 'Físico (Existencia)', 
      width: 140, 
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      sortable: true,
      cellStyle: params => ({
        fontWeight: 'bold',
        color: params.value <= 0 ? '#dc2626' : (params.data.minStock > 0 && params.value <= params.data.minStock ? '#d97706' : '#15803d')
      })
    },
    {
      field: 'alerta',
      headerName: 'Estatus Stock',
      width: 130,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellStyle: params => ({
        fontWeight: 'bold',
        color: params.value.includes('Agotado') ? '#dc2626' : params.value.includes('Reorden') ? '#d97706' : '#15803d'
      })
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true
  }), []);

  return (
    <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3>Existencias por Almacén (Agrupado)</h3>
        <button className="btn secondary" onClick={() => gridApi?.exportDataAsCsv()}>Exportar CSV</button>
      </div>
      <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          pagination={true}
          paginationPageSize={20}
        />
      </div>
    </div>
  );
}
