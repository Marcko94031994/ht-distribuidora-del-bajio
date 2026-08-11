import React, { useMemo } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { pesosDecimals } from '../utils/helpers';

export default function KardexGrid({ data }) {
  const rowData = useMemo(() => {
    if (!data) return [];
    
    return data.map(m => {
      const isEntrada = m.type === 'Entrada';
      const isMerma = m.reason && m.reason.toLowerCase().includes('merma');
      const isDevolucion = m.reason && m.reason.toLowerCase().includes('devol');
      
      return {
        id: m.id,
        date: m.date ? new Date(m.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—',
        timestamp: m.date ? new Date(m.date).getTime() : 0,
        type: isEntrada ? '📥 Entrada' : (isMerma ? '🗑️ Merma' : (isDevolucion ? '🔄 Devolución' : '📤 Salida')),
        reference: m.reference || `FOL-${m.id}`,
        sku: m.productSku || '—',
        product: m.productName,
        warehouse: m.warehouseName || 'General',
        entrada: isEntrada ? m.quantity : 0,
        salida: !isEntrada ? m.quantity : 0,
        reason: m.reason || '—',
        unitCost: m.unitCost || 0,
        averageCost: m.averageCost || 0
      };
    }).sort((a, b) => b.timestamp - a.timestamp); // Sort by date descending
  }, [data]);

  const columns = useMemo(() => [
    { accessorKey: 'date', header: 'Fecha', size: 150 },
    { accessorKey: 'type', header: 'Tipo', size: 140 },
    { accessorKey: 'reference', header: 'Folio / Ref', size: 140 },
    { accessorKey: 'sku', header: 'SKU', size: 110 },
    { accessorKey: 'product', header: 'Producto', size: 250 },
    { accessorKey: 'warehouse', header: 'Almacén', size: 140 },
    { 
      accessorKey: 'entrada', 
      header: 'Entrada (+)', 
      size: 110,
      Cell: ({ cell }) => <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{cell.getValue()}</span>
    },
    { 
      accessorKey: 'salida', 
      header: 'Salida (-)', 
      size: 110,
      Cell: ({ cell }) => <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{cell.getValue()}</span>
    },
    { 
      accessorKey: 'unitCost', 
      header: 'Costo Mov.', 
      size: 130,
      Cell: ({ cell }) => <span style={{ fontWeight: 600 }}>{pesosDecimals(cell.getValue())}</span>
    },
    { 
      accessorKey: 'averageCost', 
      header: 'Costo Promedio', 
      size: 130,
      Cell: ({ cell }) => <span style={{ color: '#0f172a', fontWeight: 700 }}>{pesosDecimals(cell.getValue())}</span>
    },
    { accessorKey: 'reason', header: 'Motivo', size: 200 }
  ], []);

  const handleExportData = () => {
    const csvRows = [];
    const headers = columns.map(c => c.header).join(',');
    csvRows.push(headers);
    rowData.forEach(row => {
      const values = columns.map(c => {
        let val = row[c.accessorKey] != null ? String(row[c.accessorKey]) : '';
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'kardex.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const table = useMaterialReactTable({
    columns,
    data: rowData,
    enableGrouping: true,
    enableColumnDragging: true,
    initialState: {
      density: 'compact',
      expanded: true,
      pagination: { pageSize: 20 },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: { borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }
    }
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Libro Mayor de Movimientos (Kárdex)
          </h3>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {rowData.length} registro(s) encontrados
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={handleExportData}
          >
            Descargar CSV
          </button>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <MaterialReactTable table={table} />
      </div>
    </div>
  );
}
