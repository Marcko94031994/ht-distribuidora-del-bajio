import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pesos } from '../utils/helpers';

export default function Facturacion({ data, reloadState, initialTab = 'ingreso' }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('pendientes'); // pendientes | historial
  const [tab, setTab] = useState(initialTab); // ingreso | pago | egreso

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [pending, setPending] = useState({ ingresos: [], pagos: [], egresos: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  
  
  const handleViewXml = async (type, id) => {
    const token = localStorage.getItem('ht_token');
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/cfdi/xml/${type.toLowerCase()}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cfdi_${type.toLowerCase()}_${id}.xml`;
        a.click();
      } else {
        const err = await res.text();
        alert('Error al descargar XML: ' + err);
      }
    } catch (ex) {
      alert('Error de red al obtener XML.');
    }
  };


  const cancelarCfdi = async (type, id) => {
    const motivo = prompt("Ingrese el motivo de cancelación:\n01: Errores con relación\n02: Errores sin relación\n03: No se llevó a cabo\n04: Operación nominativa relacionada en factura global\n\nPor defecto: 02", "02");
    if (!motivo) return;

    let foliosustitucion = "";
    if (motivo === "01") {
        foliosustitucion = prompt("Ingrese el Folio Fiscal de sustitución:");
        if (!foliosustitucion) {
            alert("Para el motivo 01 es obligatorio el Folio Fiscal de sustitución.");
            return;
        }
    }

    if (!confirm(`¿Estás seguro de cancelar este CFDI en el SAT? Esta acción es irreversible.`)) return;

    setLoading(true);
    const token = localStorage.getItem('ht_token');
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/cfdi/cancel/${type.toLowerCase()}/${id}?motivo=${motivo}&folioSustitucion=${foliosustitucion}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert('CFDI Cancelado exitosamente.');
        fetchCfdiData();
      } else {
        alert('Error al cancelar: ' + (data.message || data.title || 'Error desconocido'));
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (type, id) => {
    const token = localStorage.getItem('ht_token');
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/cfdi/pdf/${type.toLowerCase()}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const err = await res.text();
        alert('Error al generar PDF: ' + err);
      }
    } catch (ex) {
      alert('Error de red al obtener PDF.');
    }
  };

  const fetchCfdiData = async () => {
    setLoading(true);
    const token = localStorage.getItem('ht_token');
    try {
      if (filter === 'pendientes') {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/cfdi/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setPending(json);
        }
      } else {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/cfdi/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setHistory(json);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCfdiData();
  }, [filter]);

  const timbrarCfdi = async (type, id) => {
    if (!confirm(`¿Deseas generar el CFDI 4.0 de tipo ${type.toUpperCase()}?`)) return;
    
    const token = localStorage.getItem('ht_token');
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/cfdi/stamp/${type}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('✅ CFDI 4.0 Generado exitosamente. Se ha enviado al correo del cliente.');
        fetchCfdiData();
        reloadState();
      } else {
        const err = await res.text();
        alert('❌ Error SAT: ' + err);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="view-container animate-fade-in">
      <div className="glass" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>📄 Centro de Facturación CFDI 4.0</h2>
          <p className="muted">Emisión manual de facturas, complementos y notas de crédito.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`btn ${filter === 'pendientes' ? 'primary' : 'secondary'}`} onClick={() => setFilter('pendientes')}>Por Facturar</button>
          <button className={`btn ${filter === 'historial' ? 'primary' : 'secondary'}`} onClick={() => setFilter('historial')}>Historial CFDI</button>
        </div>
      </div>

      {filter === 'pendientes' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button className={`btn ${tab === 'ingreso' ? 'primary' : 'secondary'}`} onClick={() => setTab('ingreso')}>Ingresos (Pedidos)</button>
          <button className={`btn ${tab === 'pago' ? 'primary' : 'secondary'}`} onClick={() => setTab('pago')}>Complementos de Pago</button>
          <button className={`btn ${tab === 'egreso' ? 'primary' : 'secondary'}`} onClick={() => setTab('egreso')}>Notas de Crédito (Egresos)</button>
        </div>
      )}

      <div className="glass" style={{ padding: '20px', borderRadius: '24px' }}>
        {loading ? (
          <p>Cargando datos...</p>
        ) : (
          <table className="table full">
            <thead>
              <tr>
                {filter === 'historial' && <th>Tipo</th>}
                <th>Folio Interno</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Monto</th>
                {filter === 'pendientes' && <th>RFC</th>}
                {filter === 'historial' && <th>UUID</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filter === 'pendientes' ? (
                (pending[tab + 's'] || []).map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.folio}</td>
                    <td>{item.clientName}</td>
                    <td>{item.date}</td>
                    <td style={{ fontWeight: 800 }}>{pesos(item.amount)}</td>
                    <td className="muted">{item.clientRfc || 'SIN RFC'}</td>
                    <td>
                      <button 
                        className="btn primary small" 
                        disabled={!item.clientRfc}
                        onClick={() => timbrarCfdi(tab, item.id)}
                        title={!item.clientRfc ? 'Faltan datos fiscales del cliente' : ''}
                      >
                        {item.clientRfc ? '🧾 Timbrar' : '⚠️ Sin RFC'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                history.map(item => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                        background: item.type === 'Ingreso' ? '#dbeafe' : item.type === 'Pago' ? '#dcfce7' : '#fee2e2',
                        color: item.type === 'Ingreso' ? '#1e40af' : item.type === 'Pago' ? '#166534' : '#991b1b'
                      }}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.folio}</td>
                    <td>{item.clientName}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 800 }}>{pesos(item.amount)}</td>
                    <td className="muted" style={{ fontSize: '0.8rem' }}>{item.folioFiscal}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn success small" onClick={() => handleDownloadPDF(item.type, item.id)}>PDF</button>
                        <button className="btn secondary small" onClick={() => handleViewXml(item.type, item.id)}>XML</button>
                        {!(item.folioFiscal || '').includes('CANCELADO') && (
                          <button className="btn danger small" onClick={() => cancelarCfdi(item.type, item.id)}>Cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {filter === 'pendientes' && (pending[tab + 's'] || []).length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }} className="muted">No hay {tab}s pendientes de facturar.</td></tr>
              )}
              {filter === 'historial' && history.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }} className="muted">No hay CFDIs emitidos.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
