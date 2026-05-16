export default function Rutas({data,sucursal,vendedor,addVendedor,addRuta,selectedRuta,setSelectedRuta,setSelectedCliente}){
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Alta vendedores</h3>
        </div>
        <div className="card-b">
          <form onSubmit={addVendedor} className="form-grid">
            <input name="nombre" className="input full" placeholder="Nombre" required/>
            <input name="telefono" className="input" placeholder="Teléfono"/>
            <input name="comision" type="number" step="0.01" className="input" placeholder="% Comisión" required/>
            <select name="vehiculoId" className="select full">
              <option value="">Seleccionar unidad...</option>
              {data.unidades?.map(u=><option value={u.id} key={u.id}>{u.brand} {u.model} ({u.plateNumber})</option>)}
            </select>
            <select name="sucursalId" className="select full" required>
              <option value="">Seleccionar sucursal...</option>
              {data.sucursales.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
            </select>
            <button className="btn full">Guardar vendedor</button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Alta rutas</h3>
        </div>
        <div className="card-b">
          <form onSubmit={addRuta} className="form-grid">
            <input name="nombre" className="input" placeholder="Ruta" required/>
            <select name="dia" className="select">
              <option>Lunes</option>
              <option>Martes</option>
              <option>Miércoles</option>
              <option>Jueves</option>
              <option>Viernes</option>
            </select>
            <select name="sucursalId" className="select">
              <option value="">Seleccionar sucursal...</option>
              {data.sucursales.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
            </select>
            <select name="vendedorId" className="select">
              {data.vendedores.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}
            </select>
            <textarea name="clientes" className="textarea full" placeholder="Clientes separados por coma"></textarea>
            <button className="btn full">Guardar ruta</button>
          </form>
          <br/>
          <div className="list">
            {data.rutas.map(r=>(
              <div className={'item '+(selectedRuta===r.id?'active':'')} key={r.id}>
                <div style={{ flex: 1 }} onClick={()=>{setSelectedRuta(r.id);setSelectedCliente(r.clientes[0]?.id)}}>
                  <div className="row">
                    <b>{r.name}</b>
                    <span className="chip">{r.dayOfWeek}</span>
                  </div>
                  <div className="muted">{sucursal(r.branchId)?.name} · {vendedor(r.driverId)?.name}</div>
                </div>
                <button className="btn secondary" style={{ marginTop: '10px' }} onClick={async () => {
                  const token = localStorage.getItem('ht_token');
                  const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/app/loading-sheet/${r.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                  if (res.ok) {
                    const items = await res.json();
                    if (items.length === 0) return alert('No hay pedidos pendientes para esta ruta.');
                    const text = items.map(i => `${i.sku} - ${i.name}: ${i.totalQuantity} pzas`).join('\n');
                    alert(`HOJA DE CARGA - ${r.name.toUpperCase()}\n\n${text}`);
                  }
                }}>
                  📋 Hoja de Carga
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Vendedores</h3>
        </div>
        <div className="card-b list">
          {data.vendedores.map(v=>(
            <div className="item" key={v.id}>
              <div className="row">
                <b>{v.name}</b>
                <span className="chip ok">{v.status}</span>
              </div>
              <div className="muted">{v.phone} · Comisión: {v.commissionPercentage}%</div>
              <div className="muted">
                Unidad: {data.unidades?.find(u=>u.id===v.vehicleId)?.plateNumber || 'No asignada'}
              </div>
              <div className="muted">{sucursal(v.branchId)?.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
