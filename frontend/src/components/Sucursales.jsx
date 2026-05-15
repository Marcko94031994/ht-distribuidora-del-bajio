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
            <input name="nombre" className="input full" placeholder="Nombre del almacÃÂ©n" required/>
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
            <button className="btn full">Guardar almacÃÂ©n</button>
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
    </div>
  );
}

