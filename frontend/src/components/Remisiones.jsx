import React, { useState } from 'react';
import { pesos } from '../utils/helpers';

export default function Remisiones({data,pedido,setSelectedPedido,ruta,vendedor,producto,cambiarPedidoStatus,registrarDevolucion}){
  const [photoBase64, setPhotoBase64] = useState(null);
  const [returnItems, setReturnItems] = useState({});

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDelivery = () => {
    cambiarPedidoStatus('Entregado', photoBase64);
    setPhotoBase64(null);
  };

  const handleReturn = () => {
    const reason = prompt("Razón de la devolución (ej: Producto dañado, Caducado):");
    if(!reason) return;
    
    const returns = Object.entries(returnItems).map(([productId, quantity]) => ({
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      reason: reason
    })).filter(r => r.quantity > 0);

    if(returns.length === 0) {
      alert("Debes ingresar la cantidad a devolver de al menos un producto.");
      return;
    }

    registrarDevolucion(returns);
    setReturnItems({});
  };

  if(!pedido)return null;
  const r=ruta(pedido.routeId);
  const c=r?.clientes?.find(x=>x.id===pedido.clientId);
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">
          <h3>Remisiones</h3>
        </div>
        <div className="card-b list">
          {data.pedidos.map(p=>(
            <div className={'item '+(pedido.id===p.id?'active':'')} onClick={()=>setSelectedPedido(p.id)} key={p.id}>
              <div className="row">
                <b>{p.orderNumber}</b>
                <span className={'chip '+(p.status==='Entregado'?'ok':p.status==='Pendiente'?'warn':p.status==='Entregado con Devolución'?'danger':'')}> {p.status}</span>
              </div>
              <div className="muted">Ruta: {ruta(p.routeId)?.name}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card double">
        <div className="card-h">
          <h3>Detalle de {pedido.orderNumber}</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => {
               const itemsTxt = pedido.items.map(i => `${producto(i.productId)?.name} x ${i.quantity} = ${pesos(producto(i.productId)?.price * i.quantity)}`).join('\n');
               const total = pedido.items.reduce((sum, i) => sum + (producto(i.productId)?.price * i.quantity), 0);
               const text = `ð§¾ *TICKET HT DISTRIBUIDORA*\n--------------------------\nFolio: ${pedido.orderNumber}\nCliente: ${c?.name}\n\n${itemsTxt}\n\n*TOTAL: ${pesos(total)}*\n--------------------------\nÂ¡Gracias por su compra!`;
               const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
               window.open(url, '_blank');
            }}>ð± Compartir WhatsApp</button>
            <div className="muted">{pedido.time} Â· {vendedor(pedido.driverId)?.name}</div>
          </div>
        </div>
        <div className="card-b">
          <p><b>Cliente:</b> {c?.name}</p>
          <p><b>Zona:</b> {c?.zone}</p>
          <br/>
          <div className="cart-row cart-head">
            <div>Prod</div><div>Cant</div><div>Precio</div><div>Devolver</div>
          </div>
          {pedido.items.map((i,idx)=>{
            const prod=producto(i.productId);
            return (
              <div className="cart-row" key={idx}>
                <div>{prod?.name}</div>
                <div>{i.quantity}</div>
                <div>{pesos(prod?.price)}</div>
                <div>
                  {pedido.status === 'En remisión' ? (
                    <input 
                      type="number" 
                      min="0" 
                      max={i.quantity} 
                      className="input" 
                      style={{width: '60px'}}
                      value={returnItems[i.productId] || ''}
                      onChange={(e) => setReturnItems({...returnItems, [i.productId]: e.target.value})}
                    />
                  ) : '-'}
                </div>
              </div>
            )
          })}
          <br/>
          <div style={{display:'flex',gap:'1rem', flexWrap: 'wrap'}}>
            {pedido.status==='Pendiente'&&<button className="btn success" onClick={()=>cambiarPedidoStatus('En remisión')}>Autorizar y Despachar</button>}
            {pedido.status==='En remisión'&&<button className="btn secondary" onClick={()=>cambiarPedidoStatus('Cancelado')}>Cancelar Pedido</button>}
            {pedido.status==='En remisión'&&(
              <>
                <div style={{display:'flex',gap:'1rem', alignItems:'center'}}>
                  <div>
                    <label className="muted">Evidencia de Entrega:</label>
                    <input type="file" accept="image/*" capture="environment" className="input full" onChange={handlePhoto} />
                  </div>
                  <button className="btn primary" onClick={handleDelivery}>Marcar Entregado</button>
                  <button className="btn danger" onClick={handleReturn}>Registrar Devolución Parcial</button>
                </div>
              </>
            )}
          </div>
          {photoBase64 && <img src={photoBase64} alt="Evidencia temp" style={{ width: '80px', height: '80px', objectFit: 'cover', marginTop: '1rem' }} />}
          
          {pedido.status === 'Entregado con Devolución' && (
            <div style={{marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
              <h4 className="danger">Productos Devueltos:</h4>
              {data.devoluciones?.filter(d => d.orderId === pedido.id).map(d => (
                <div key={d.id} className="item">
                  <div className="row">
                    <b>{producto(d.productId)?.name}</b>
                    <span>Cant: {d.quantity}</span>
                    <span className="chip warn">{d.status}</span>
                  </div>
                  <div className="muted">Razón: {d.reason}</div>
                </div>
              ))}
            </div>
          )}

          {pedido.deliveryPhotoBase64 && (
            <div style={{ marginTop: '1rem' }}>
              <p><b>Foto de Entrega Guardada:</b></p>
              <img src={pedido.deliveryPhotoBase64} alt="Evidencia final" style={{ width: '200px', borderRadius: '8px' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
