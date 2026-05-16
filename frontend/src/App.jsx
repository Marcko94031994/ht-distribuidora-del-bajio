import { useState, useMemo, useEffect } from 'react';
import Kpi from './components/Kpi';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Sucursales from './components/Sucursales';
import Rutas from './components/Rutas';
import Vendedor from './components/Vendedor';
import Remisiones from './components/Remisiones';
import Almacen from './components/Almacen';
import Productos from './components/Productos';
import Proveedores from './components/Proveedores';
import Clientes from './components/Clientes';
import TorreControl from './components/TorreControl';
import Reportes from './components/Reportes';
import Liquidacion from './components/Liquidacion';
import Usuarios from './components/Usuarios';
import Cobranza from './components/Cobranza';
import Facturacion from './components/Facturacion';
import Masivos from './components/Masivos';
import TiendaB2B from './components/TiendaB2B';

function App() {
  const [logged,setLogged]=useState(!!localStorage.getItem('ht_token')); 
  const [user,setUser]=useState(() => {
    const saved = localStorage.getItem('ht_user');
    return saved ? JSON.parse(saved) : {email:'demo@abarrotera.mx',pass:'123456',sucursalId:1};
  });
  const [data,setData]=useState({sucursales:[], almacenes:[], vendedores:[], rutas:[], productos:[], pedidos:[], compras:[], proveedores:[], preciosEspeciales:[], devoluciones:[], gastos: [], categoriasGastos: [], unidades: [], cierresCaja: []}); 
  const [reports,setReports]=useState({ventasMargen:[], riesgoMerma:[], valorInventario:[], totalUtilidad:0});
  const [kpiData, setKpiData] = useState({ suc: 0, alm: 0, ped: 0, pend: 0, rutas: 0 });

  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('ht_token');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('ht_token');
      setLogged(false);
    }
    return res;
  };

  useEffect(() => {
    if (logged) {
      apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/state')
        .then(res => res.ok ? res.json() : null)
        .then(json => json && setData(prev => ({...prev, ...json})))
        .catch(err => console.error('Error fetching API:', err));

      apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/kpis')
        .then(res => res.ok ? res.json() : null)
        .then(json => json && setKpiData(json))
        .catch(err => console.error('Error fetching KPIs:', err));

      apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/orders?page=1')
        .then(res => res.ok ? res.json() : null)
        .then(json => json && setData(prev => ({...prev, pedidos: json.data})))
        .catch(err => console.error('Error fetching Orders:', err));

      apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/products?page=1')
        .then(res => res.ok ? res.json() : null)
        .then(json => json && setData(prev => ({...prev, productos: json.data})))
        .catch(err => console.error('Error fetching Products:', err));

    if (user.role === 'Admin') {
      apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/reports')
        .then(res => res.ok ? res.json() : null)
        .then(json => json && setReports(json))
        .catch(err => console.error('Error fetching Reports:', err));
    }

      // Sync offline orders
      const offlineOrders = JSON.parse(localStorage.getItem('ht_offline_orders') || '[]');
      if (offlineOrders.length > 0) {
        console.log('Syncing offline orders...', offlineOrders.length);
        offlineOrders.forEach(async (order, idx) => {
           try {
             const res = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/order', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(order)
             });
             if (res.ok) {
               const current = JSON.parse(localStorage.getItem('ht_offline_orders') || '[]');
               localStorage.setItem('ht_offline_orders', JSON.stringify(current.filter((_, i) => i !== idx)));
               reloadState();
             }
           } catch(e) {}
        });
      }
    }
  }, [logged]);

  const handleLogin = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/app/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.pass, sucursalId: user.sucursalId })
      });
      if(res.ok) {
        const payload = await res.json();
        localStorage.setItem('ht_token', payload.token);
        localStorage.setItem('ht_user', JSON.stringify(user));
        setLogged(true);
      } else alert("Credenciales incorrectas");
    } catch(e) {
      console.error(e);
      alert("Error de conexión a la API");
    }
  };

  const [tab,setTab]=useState('dashboard'); 
  const [selectedRuta,setSelectedRuta]=useState(1); 
  const [selectedCliente,setSelectedCliente]=useState(1); 
  const [cart,setCart]=useState([]); 
  const [selectedPedido,setSelectedPedido]=useState('P-1001');

  const sucursal=id=>data.sucursales.find(x=>x.id==id); 
  const vendedor=id=>data.vendedores.find(x=>x.id==id); 
  const almacen=id=>data.almacenes.find(x=>x.id==id); 
  const producto=id=>data.productos.find(x=>x.id==id); 
  const ruta=id=>data.rutas.find(x=>x.id==id); 
  const cliente=id=>data.rutas.flatMap(r=>r.clientes||[]).find(c=>c.id==id);
  const proveedor=id=>data.proveedores?.find(x=>x.id==id);

  const currentRuta=ruta(selectedRuta)||data.rutas[0]; 
  const currentCliente=currentRuta?.clientes?.find(c=>c.id===selectedCliente)||currentRuta?.clientes?.[0]; 
  const currentPedido=data.pedidos?.find(p=>p.id===selectedPedido)||data.pedidos?.[0];

  const kpis=kpiData;

  if(!logged) return <Login user={user} setUser={setUser} onLogin={handleLogin}/>;

  const reloadState = async () => {
    try {
      const res = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/state');
      if (res.ok) {
        const stateData = await res.json();
        setData(prev => ({...prev, ...stateData}));
      }

      const resKpi = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/kpis');
      if (resKpi.ok) setKpiData(await resKpi.json());

      const resOrd = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/orders?page=1');
      if (resOrd.ok) {
        const ordData = await resOrd.json();
        setData(prev => ({...prev, pedidos: ordData.data}));
      }

      const resProd = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/products?page=1');
      if (resProd.ok) {
        const prodData = await resProd.json();
        setData(prev => ({...prev, productos: prodData.data}));
      }

      const resRep = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/reports');
      if (resRep.ok) setReports(await resRep.json());
    } catch (e) { console.error('Error fetching state:', e); }
  };

  const addSucursal = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.get('nombre'), zone: f.get('zona'), manager: f.get('responsable') })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addAlmacen = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: f.get('nombre'), sucursalId: Number(f.get('sucursalId')), tipo: f.get('tipo'), responsable: f.get('responsable') })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addVendedor = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: f.get('nombre'), 
          telefono: f.get('telefono'), 
          vehiculoId: f.get('vehiculoId') ? Number(f.get('vehiculoId')) : null, 
          sucursalId: Number(f.get('sucursalId')),
          comision: Number(f.get('comision'))
        })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addRuta = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: f.get('nombre'), dia: f.get('dia'), sucursalId: Number(f.get('sucursalId')), vendedorId: Number(f.get('vendedorId')), clientesText: f.get('clientes') || '' })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };
  
  // New endpoints
  const addProducto = async (payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateProducto = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/product/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateCliente = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/client/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateProveedor = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/provider/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addProveedor = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.get('name'), contact: f.get('contact'), phone: f.get('phone') })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addCliente = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.get('name'), zone: f.get('zone'), latitude: Number(f.get('latitude')), longitude: Number(f.get('longitude')), routeId: Number(f.get('routeId')) })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };

  // Cart logic updated for boxes and client prices
  const addCart = (pIdArg = null, qArg = null, isBox = false) => {
    const pId = pIdArg || Number(document.getElementById('prodPedido')?.value);
    const q = qArg !== null ? qArg : Number(document.getElementById('qtyPedido')?.value || 1);
    const prod = producto(pId);
    if (!prod) return;
    
    // Calculate total units being added
    const unitsToAdd = isBox ? q * prod.unitsPerBox : q;
    if (unitsToAdd <= 0 || unitsToAdd > prod.stock) return alert('Cantidad no válida o sin existencia suficiente'); 

    // Determine effective price per unit
    let unitPrice = prod.price;
    
    // 1. Check if client has a special price
    const clientPrice = data.preciosEspeciales?.find(cp => cp.clientId === currentCliente?.id && cp.productId === pId);
    if (clientPrice) {
      unitPrice = clientPrice.specialPrice;
    } else {
      // 2. Check box vs volume
      if (isBox) {
        unitPrice = prod.boxPrice / prod.unitsPerBox;
      } else if (unitsToAdd >= 10) {
        unitPrice = prod.volumePrice;
      }
    }

    setCart(c => {
      const ex = c.find(x => x.productoId === pId && x.isBox === isBox);
      if (ex) {
        return c.map(x => x.productoId === pId && x.isBox === isBox ? { ...x, cantidad: x.cantidad + q, unitPrice } : x);
      }
      return [...c, { productoId: pId, cantidad: q, isBox, unitPrice, unitsToAdd }];
    });
  };
  
  const enviarPedido = async (photoBase64, lat = 0, long = 0) => {
    let clientId = currentCliente?.id;
    let routeId = currentRuta?.id;
    let driverId = currentRuta?.driverId;

    // B2B Case: If no client selected in Vendedor view, try the user's linked client
    if (!clientId && user.ClientId) {
      clientId = user.ClientId;
      // Search in data to find the client and its assigned route
      const allClients = data.rutas?.flatMap(r => r.clients) || [];
      const cli = allClients.find(c => c.id === clientId);
      if (cli) {
        routeId = cli.routeId;
        const route = data.rutas?.find(r => r.id === routeId);
        driverId = route?.driverId;
      }
    }

    if (!cart.length || !routeId || !clientId) return alert('No se pudo identificar el cliente o la ruta de despacho.');

    const payload = {
      clientId,
      routeId,
      driverId,
      photoBase64: photoBase64,
      items: cart.map(c => ({ productId: c.productoId, quantity: c.unitsToAdd })),
      latitude: lat,
      longitude: long
    };

    try {
      const res = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      
      setCart([]);
      setTab('remisiones');
      reloadState();
    } catch(e) { 
      // Save offline
      const current = JSON.parse(localStorage.getItem('ht_offline_orders') || '[]');
      localStorage.setItem('ht_offline_orders', JSON.stringify([...current, payload]));
      alert('Sin conexión. Pedido guardado localmente; se enviará automáticamente al recuperar señal.');
      setCart([]);
      setTab('dashboard');
    }
  };

  const reportarContratiempo = async () => {
    if(!currentRuta) return;
    const reason = prompt("Describe el contratiempo (ej. Ponchadura, Tráfico pesado):");
    if (!reason) return;
    try {
      const payload = { driverId: currentRuta.driverId, reason };
      const res = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/incident', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (res.ok) { alert('Contratiempo reportado a la Torre de Control'); reloadState(); }
    } catch (e) { console.error(e); }
  };
  
  const cambiarPedidoStatus = async (status, photoBase64 = null) => {
    if(!currentPedido) return;
    if(status === 'En remisión') {
      try {
        await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/authorize-order/${currentPedido.id}`, { method: 'POST' });
        reloadState();
      } catch(e) { console.error(e); }
    } else if (status === 'Entregado') {
      try {
        await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/complete-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: currentPedido.id, photoBase64 })
        });
        reloadState();
      } catch(e) { console.error(e); }
    } else {
      try {
        await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/order/${currentPedido.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(status)
        });
        reloadState();
      } catch(e) { console.error(e); }
    }
  };

  const registrarDevolucion = async (returns) => {
    if(!currentPedido) return;
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/order-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentPedido.id, returns })
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const autorizarDevolucion = async (returnId, isWaste) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/order-return/${returnId}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWaste })
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addOC = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/purchase-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          providerId: Number(f.get('providerId')), 
          productoId: Number(f.get('productoId')), 
          cantidad: Number(f.get('cantidad')), 
          costo: Number(f.get('costo')),
          lote: f.get('lote'),
          caducidad: f.get('caducidad')
        })
      });
      e.currentTarget.reset();
      reloadState();
    } catch(e) { console.error(e); }
  };

  const aplicarCompra = async (oc) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/purchase-order/${oc.id}/apply`, { method: 'POST' });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_user');
    setLogged(false);
  };

  const addUser = async (payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateUser = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/user/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  return (
    <div className="app-layout">
      <Sidebar tab={tab} setTab={setTab} user={user} sucursal={sucursal(user.sucursalId)} logout={handleLogout}/>
      <div className="app-content">
        <div style={{ background: 'var(--brand-beige)', height: '4px', borderRadius: '10px', marginBottom: '10px', width: '100%' }}></div>
      {tab==='dashboard'&&(
        <>
          <section className="hero">
            <div className="hero-main">
              <h1>Sistema abarrotera · preventa, almacén y despacho</h1>
              <p>Demo con catálogos dinámicos, PWA, precios por volumen y evidencias fotográficas.</p>
            </div>
            <Kpi label="Sucursales" v={kpis.suc}/>
            <Kpi label="Almacenes" v={kpis.alm}/>
            <Kpi label="Rutas" v={kpis.rutas}/>
            <Kpi label="Pedidos" v={kpis.ped}/>
          </section>
          <Dashboard data={data} sucursal={sucursal} vendedor={vendedor} producto={producto}/>
        </>
      )} 
      {tab==='torre'&&<TorreControl data={data} vendedor={vendedor}/>}
      {tab==='reportes'&&<Reportes data={data} reports={reports} producto={producto} cliente={cliente}/>}
      {tab==='sucursales'&&<Sucursales data={data} sucursal={sucursal} addAlmacen={addAlmacen} addSucursal={addSucursal}/>} 
      {tab==='rutas'&&<Rutas data={data} sucursal={sucursal} vendedor={vendedor} addVendedor={addVendedor} addRuta={addRuta} selectedRuta={selectedRuta} setSelectedRuta={setSelectedRuta} setSelectedCliente={setSelectedCliente}/>} 
      {tab==='vendedor'&&<Vendedor data={data} ruta={currentRuta} cliente={currentCliente} setSelectedCliente={setSelectedCliente} vendedor={vendedor} sucursal={sucursal} producto={producto} almacen={almacen} cart={cart} setCart={setCart} addCart={addCart} enviarPedido={enviarPedido} reportarContratiempo={reportarContratiempo}/>} 
      {tab==='remisiones'&&<Remisiones data={data} pedido={currentPedido} setSelectedPedido={setSelectedPedido} ruta={ruta} vendedor={vendedor} producto={producto} cambiarPedidoStatus={cambiarPedidoStatus} registrarDevolucion={registrarDevolucion}/>} 
      {tab==='almacen'&&<Almacen data={data} sucursal={sucursal} almacen={almacen} producto={producto} proveedor={proveedor} addOC={addOC} aplicarCompra={aplicarCompra} devoluciones={data.devoluciones} autorizarDevolucion={autorizarDevolucion}/>}
      {tab==='productos'&&<Productos data={data} addProducto={addProducto} updateProducto={updateProducto} almacen={almacen}/>}
      {tab==='clientes'&&<Clientes data={data} addCliente={addCliente} updateCliente={updateCliente} ruta={ruta}/>}
      {tab==='proveedores'&&<Proveedores data={data} addProveedor={addProveedor} updateProveedor={updateProveedor}/>}
      {tab==='liquidacion'&&<Liquidacion data={data} ruta={ruta} vendedor={vendedor}/>}
      {tab==='masivos'&&<Masivos data={data} reloadState={reloadState}/>}
      {tab==='usuarios'&&<Usuarios data={data} addUser={addUser} updateUser={updateUser}/>}
      {tab==='cobranza'&&<Cobranza data={data} reloadState={reloadState}/>}
      {tab==='facturacion'&&<Facturacion data={data} reloadState={reloadState}/>}
      {tab==='tienda'&&<TiendaB2B data={data} cart={cart} setCart={setCart} addCart={addCart} enviarPedido={enviarPedido}/>}
      </div>
    </div>
  );
}

export default App;
