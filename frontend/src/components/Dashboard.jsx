import { pesos } from '../utils/helpers';

export default function Dashboard({data,sucursal,vendedor,producto}){
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Pedidos recientes</h3>
          <span className="chip warn">Tiempo real</span>
        </div>
        <div className="card-b list">
          {data.pedidos.map(p=>(
            <div className="item" key={p.id}>
              <div className="row"><b>{p.id}</b><span className="chip">{p.status}</span></div>
              <div>{p.cliente}</div>
              <div className="muted">{vendedor(p.driverId)?.name} · {p.hora}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Resumen operativo</h3>
        </div>
        <div className="card-b">
          <div className="warehouse">
            <div className="wh">
              <span className="muted">Inventario total</span>
              <strong>{data.productos.reduce((a,b)=>a+b.stock,0)}</strong>
            </div>
            <div className="wh">
              <span className="muted">Bajo stock</span>
              <strong>{data.productos.filter(p=>p.stock<=10).length}</strong>
            </div>
            <div className="wh">
              <span className="muted">Valor aprox.</span>
              <strong>{pesos(data.productos.reduce((a,b)=>a+b.stock*b.price,0))}</strong>
            </div>
          </div>
          <br/>
          <table className="table">
            <thead>
              <tr><th>Producto</th><th>Stock</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {data.productos.map(p=>(
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td>{pesos(p.stock*p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Sucursales</h3>
        </div>
        <div className="card-b list">
          {data.sucursales.map(s=>(
            <div className="item" key={s.id}>
              <b>{s.name}</b>
              <div className="muted">{s.zone}</div>
              <span className="chip ok">{data.almacenes.filter(a=>a.branchId===s.id).length} almacén(es)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
