export default function Sucursales({data,sucursal,addAlmacen,addSucursal}){
  return (
    <div className="grid three">
      <div className="card">
        <div className="card-h">
          <h3>Alta de sucursales</h3>
          <span className="chip warn">Nodo principal</span>
        </div>
        <div className="card-b">
          <form onSubmit={addSucursal} className="form-grid">
            <input name="nombre" className="input full" placeholder="Nombre de la sucursal" required/>
            <input name="zona" className="input full" placeholder="Zona / Ciudad" required/>
            <input name="responsable" className="input full" placeholder="Gerente de sucursal" required/>
            <button className="btn full">Guardar sucursal</button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Alta de almacenes</h3>
          <span className="chip ok">Ligado a sucursal</span>
        </div>
        <div className="card-b">
          <form onSubmit={addAlmacen} className="form-grid">
            <input name="nombre" className="input full" placeholder="Nombre del almacén" required/>
            <select name="sucursalId" className="select">
              <option value="">Seleccionar sucursal...</option>
              {data.sucursales.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
            </select>
            <select name="tipo" className="select">
              <option>Principal</option>
              <option>Sucursal</option>
              <option>Temporal</option>
            </select>
            <input name="responsable" className="input full" placeholder="Responsable" required/>
            <button className="btn full">Guardar almacén</button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Almacenes registrados</h3>
        </div>
        <div className="card-b list">
          {data.almacenes.map(a=>(
            <div className="item" key={a.id}>
              <div className="row">
                <b>{a.name}</b>
                <span className="chip ok">{a.type}</span>
              </div>
              <div className="muted">Sucursal: {sucursal(a.branchId)?.name}</div>
              <div className="muted">Responsable: {a.manager}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card double" style={{gridColumn: '1 / -1'}}>
        <div className="card-h">
          <h3>Layout de Almacén (Ubicaciones y Racks)</h3>
        </div>
        <div className="card-b">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const token = localStorage.getItem('ht_token');
            const res = await fetch('/api/app/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ name: f.get('name'), description: f.get('description'), warehouseId: Number(f.get('warehouseId')) })
            });
            if (res.ok) { window.location.reload(); }
          }} className="form-grid" style={{ marginBottom: '20px' }}>
            <select name="warehouseId" className="select" required>
              <option value="">Seleccionar Almacén</option>
              {data.almacenes?.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}
            </select>
            <input name="name" className="input" placeholder="Nombre (Ej. Pasillo 1 - Rack A)" required />
            <input name="description" className="input full" placeholder="Descripción adicional (Opcional)" />
            <button type="submit" className="btn primary">Agregar Ubicación</button>
          </form>

          <table className="table full">
            <thead>
              <tr>
                <th>Almacén</th>
                <th>Nombre de Ubicación</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {data.ubicaciones?.map(u => {
                const wh = data.almacenes?.find(a => a.id === u.warehouseId);
                return (
                  <tr key={u.id}>
                    <td>{wh?.name}</td>
                    <td><b>{u.name}</b></td>
                    <td>{u.description}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
