import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import Kpi from './components/Kpi';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Sucursales from './components/Sucursales';
import AlmacenesCatalogo from './components/AlmacenesCatalogo';
import VendedoresCatalogo from './components/VendedoresCatalogo';
import Rutas from './components/Rutas';
import Vendedor from './components/Vendedor';
import Remisiones from './components/Remisiones';
import Almacen from './components/Almacen';
import Productos from './components/Productos';
import ListaPrecios from './components/ListaPrecios';
import Proveedores from './components/Proveedores';
import Clientes from './components/Clientes';
import TorreControl from './components/TorreControl';
import Reportes from './components/Reportes';
import Liquidacion from './components/Liquidacion';
import Usuarios from './components/Usuarios';
import Cobranza from './components/Cobranza';
import CuentasPorPagar from './components/CuentasPorPagar';
import Facturacion from './components/Facturacion';
import Masivos from './components/Masivos';
import TiendaB2B from './components/TiendaB2B';
import CajaGeneral from './components/CajaGeneral';
import Mermas from './components/Mermas';
import OrdenesCompra from './components/OrdenesCompra';
import Vehiculos from './components/Vehiculos';

function App() {
  const [logged,setLogged]=useState(!!localStorage.getItem('ht_token')); 
  const [user,setUser]=useState(() => {
    const saved = localStorage.getItem('ht_user');
    return saved ? JSON.parse(saved) : {email:'demo@abarrotera.mx',pass:'123456',sucursalId:1};
  });
  const defaultData = {
    sucursales: [],
    almacenes: [],
    vendedores: [],
    rutas: [],
    clientes: [],
    productos: [],
    pedidos: [],
    compras: [],
    proveedores: [],
    preciosEspeciales: [],
    devoluciones: [],
    gastos: [],
    categoriasGastos: [],
    unidades: [],
    cierresCaja: [],
    categorias: [],
    marcas: [],
    ubicaciones: [],
    cxc: [],
    cxp: []
  };

  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem('ht_cache_data');
      if (cached) {
        return { ...defaultData, ...JSON.parse(cached) };
      }
    } catch (e) {
      console.warn('Error parsing cached data:', e);
    }
    return defaultData;
  });

  const [reports, setReports] = useState({ ventasMargen: [], riesgoMerma: [], valorInventario: [], totalUtilidad: 0 });
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

  const reloadState = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const [resState, resKpi, resOrd, resProd, resCxc, resCxp] = await Promise.allSettled([
        apiFetch(`${baseUrl}/api/app/state`),
        apiFetch(`${baseUrl}/api/app/kpis`),
        apiFetch(`${baseUrl}/api/app/orders?page=1`),
        apiFetch(`${baseUrl}/api/app/products?page=1&pageSize=1000`),
        apiFetch(`${baseUrl}/api/app/finance/cxc`),
        apiFetch(`${baseUrl}/api/app/finance/cxp`)
      ]);

      let stateUpdates = {};

      if (resState.status === 'fulfilled' && resState.value?.ok) {
        const stateJson = await resState.value.json();
        stateUpdates = { ...stateUpdates, ...stateJson };
      }

      if (resOrd.status === 'fulfilled' && resOrd.value?.ok) {
        const ordJson = await resOrd.value.json();
        stateUpdates.pedidos = ordJson.data || [];
      }

      if (resProd.status === 'fulfilled' && resProd.value?.ok) {
        const prodJson = await resProd.value.json();
        stateUpdates.productos = prodJson.data || [];
      }

      if (resCxc.status === 'fulfilled' && resCxc.value?.ok) {
        stateUpdates.cxc = await resCxc.value.json();
      }

      if (resCxp.status === 'fulfilled' && resCxp.value?.ok) {
        stateUpdates.cxp = await resCxp.value.json();
      }

      if (Object.keys(stateUpdates).length > 0) {
        setData(prev => {
          const next = { ...prev, ...stateUpdates };
          try {
            // Cache essential catalogs for instant next startup
            const toCache = {
              sucursales: next.sucursales,
              almacenes: next.almacenes,
              vendedores: next.vendedores,
              rutas: next.rutas,
              categorias: next.categorias,
              marcas: next.marcas,
              unidades: next.unidades,
              proveedores: next.proveedores,
              ubicaciones: next.ubicaciones
            };
            localStorage.setItem('ht_cache_data', JSON.stringify(toCache));
          } catch (err) {}
          return next;
        });
      }

      if (resKpi.status === 'fulfilled' && resKpi.value?.ok) {
        const kpiJson = await resKpi.value.json();
        setKpiData(kpiJson);
      }
    } catch (e) {
      console.error('Error in reloadState:', e);
    }
  };

  useEffect(() => {
    if (logged) {
      reloadState();

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
        
        const updatedUser = { ...user, ...payload.user };
        localStorage.setItem('ht_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        setLogged(true);
      } else alert("Credenciales incorrectas");
    } catch(e) {
      console.error(e);
      alert("Error de conexión a la API");
    }
  };

  const navigate = useNavigate();
  const location = useLocation();
  const tab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);
  const setTab = (newTab) => {
    if (newTab === 'dashboard') navigate('/');
    else navigate('/' + newTab);
  }; 
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

  const addSucursal = async (payloadOrEvent) => {
    try {
      let payload;
      if (payloadOrEvent && payloadOrEvent.preventDefault) {
        payloadOrEvent.preventDefault();
        const f = new FormData(payloadOrEvent.currentTarget);
        payload = { name: f.get('nombre'), zone: f.get('zona'), manager: f.get('responsable') };
      } else {
        payload = payloadOrEvent;
      }
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateSucursal = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/branch/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addAlmacen = async (payloadOrEvent) => {
    try {
      let payload;
      if (payloadOrEvent && payloadOrEvent.preventDefault) {
        payloadOrEvent.preventDefault();
        const f = new FormData(payloadOrEvent.currentTarget);
        payload = { nombre: f.get('nombre'), sucursalId: Number(f.get('sucursalId')), tipo: f.get('tipo'), responsable: f.get('responsable') };
      } else {
        payload = payloadOrEvent;
      }
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateAlmacen = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/warehouse/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addVendedor = async (payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateVendedor = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/driver/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const addRuta = async (payloadOrEvent) => {
    try {
      let payload;
      if (payloadOrEvent && payloadOrEvent.preventDefault) {
        payloadOrEvent.preventDefault();
        const f = new FormData(payloadOrEvent.currentTarget);
        payload = { nombre: f.get('nombre'), dia: f.get('dia'), sucursalId: Number(f.get('sucursalId')), vendedorId: Number(f.get('vendedorId')), clientesText: f.get('clientes') || '' };
      } else {
        payload = payloadOrEvent;
      }
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateRuta = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/route/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };
  
  // Products endpoints
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

  const addCliente = async (payloadOrEvent) => {
    try {
      let payload;
      if (payloadOrEvent && payloadOrEvent.preventDefault) {
        payloadOrEvent.preventDefault();
        const f = new FormData(payloadOrEvent.currentTarget);
        payload = { name: f.get('name'), zone: f.get('zone'), latitude: Number(f.get('latitude')), longitude: Number(f.get('longitude')), routeId: Number(f.get('routeId')) };
      } else {
        payload = payloadOrEvent;
      }
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/client', {
        method: 'POST',
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

  const addProveedor = async (payloadOrEvent) => {
    try {
      let payload;
      if (payloadOrEvent && payloadOrEvent.preventDefault) {
        payloadOrEvent.preventDefault();
        const f = new FormData(payloadOrEvent.currentTarget);
        payload = { name: f.get('name'), contact: f.get('contact'), phone: f.get('phone'), rfc: f.get('rfc'), address: f.get('address') };
      } else {
        payload = payloadOrEvent;
      }
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/provider', {
        method: 'POST',
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

  const addVehiculo = async (payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const updateVehiculo = async (id, payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + `/api/app/vehicle/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      reloadState();
    } catch(e) { console.error(e); }
  };

  const registrarPagoProveedor = async (payload) => {
    try {
      await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/provider-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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
    if (unitsToAdd <= 0 || unitsToAdd > prod.availableStock) return alert('Cantidad no válida o sin disponibilidad (Stock Apartado)'); 

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



  const registrarAjuste = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const res = await apiFetch((import.meta.env.VITE_API_URL || '') + '/api/app/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(f.get('productId')),
          quantity: Number(f.get('quantity')),
          adjustmentType: f.get('adjustmentType'),
          reason: f.get('reason')
        })
      });
      if (res.ok) {
        alert('Ajuste de inventario registrado correctamente.');
        e.target.reset();
        reloadState();
      } else {
        const err = await res.text();
        alert('Error: ' + err);
      }
    } catch (err) { console.error(err); }
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
      <Routes>
        <Route path="/" element={
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
        } />
        <Route path="/torre" element={<TorreControl data={data} vendedor={vendedor} reloadState={reloadState}/>} />
        <Route path="/reportes" element={<Reportes data={data} reports={reports} producto={producto} cliente={cliente}/>} />
        <Route path="/sucursales" element={<Sucursales data={data} sucursal={sucursal} addSucursal={addSucursal} updateSucursal={updateSucursal}/>} />
        <Route path="/almacenes" element={<AlmacenesCatalogo data={data} sucursal={sucursal} addAlmacen={addAlmacen} updateAlmacen={updateAlmacen} reloadState={reloadState} />} />
        <Route path="/vendedores" element={<VendedoresCatalogo data={data} sucursal={sucursal} addVendedor={addVendedor} updateVendedor={updateVendedor} />} />
        <Route path="/rutas" element={<Rutas data={data} sucursal={sucursal} vendedor={vendedor} addVendedor={addVendedor} updateVendedor={updateVendedor} addRuta={addRuta} updateRuta={updateRuta} selectedRuta={selectedRuta} setSelectedRuta={setSelectedRuta} setSelectedCliente={setSelectedCliente}/>} />
        <Route path="/vendedor" element={<Vendedor data={data} ruta={currentRuta} cliente={currentCliente} setSelectedCliente={setSelectedCliente} vendedor={vendedor} sucursal={sucursal} producto={producto} almacen={almacen} cart={cart} setCart={setCart} addCart={addCart} enviarPedido={enviarPedido} reportarContratiempo={reportarContratiempo} reloadState={reloadState}/>} />
        <Route path="/almacen" element={<Almacen data={data} sucursal={sucursal} almacen={almacen} producto={producto} proveedor={proveedor} devoluciones={data.devoluciones} autorizarDevolucion={autorizarDevolucion} registrarAjuste={registrarAjuste} reloadState={reloadState}/>} />
        <Route path="/kardex" element={<Almacen data={data} sucursal={sucursal} almacen={almacen} producto={producto} proveedor={proveedor} devoluciones={data.devoluciones} autorizarDevolucion={autorizarDevolucion} registrarAjuste={registrarAjuste} reloadState={reloadState}/>} />
        <Route path="/ordenes" element={<OrdenesCompra data={data} producto={producto} proveedor={proveedor} reloadState={reloadState} />} />
        <Route path="/mermas" element={<Mermas data={data} />} />
        <Route path="/productos" element={<Productos data={data} addProducto={addProducto} updateProducto={updateProducto} almacen={almacen}/>} />
        <Route path="/precios" element={<ListaPrecios data={data} reloadState={reloadState}/>} />
        <Route path="/clientes" element={<Clientes data={data} addCliente={addCliente} updateCliente={updateCliente} ruta={ruta} reloadState={reloadState}/>} />
        <Route path="/proveedores" element={<Proveedores data={data} addProveedor={addProveedor} updateProveedor={updateProveedor} registrarPago={registrarPagoProveedor}/>} />
        <Route path="/vehiculos" element={<Vehiculos data={data} addVehiculo={addVehiculo} updateVehiculo={updateVehiculo} />} />
        <Route path="/liquidacion" element={<Liquidacion data={data} ruta={ruta} vendedor={vendedor} reloadState={reloadState}/>} />
        <Route path="/caja" element={<CajaGeneral data={data} reloadState={reloadState}/>} />
        <Route path="/masivos" element={<Masivos data={data} reloadState={reloadState}/>} />
        <Route path="/usuarios" element={<Usuarios data={data} addUser={addUser} updateUser={updateUser}/>} />
        <Route path="/cobranza" element={<Cobranza data={data} reloadState={reloadState}/>} />
        <Route path="/cxc" element={<Cobranza data={data} reloadState={reloadState}/>} />
        <Route path="/cxc/antiguedad" element={<Cobranza data={data} reloadState={reloadState} initialView="antiguedad"/>} />
        <Route path="/cxc/estado-cuenta" element={<Cobranza data={data} reloadState={reloadState} initialView="edo_cuenta"/>} />
        <Route path="/cxp" element={<CuentasPorPagar data={data} reloadState={reloadState}/>} />
        <Route path="/cxp/antiguedad" element={<CuentasPorPagar data={data} reloadState={reloadState} initialView="antiguedad"/>} />
        <Route path="/cxp/pagos" element={<CuentasPorPagar data={data} reloadState={reloadState} initialView="pagos"/>} />
        <Route path="/cxp/estado-cuenta" element={<CuentasPorPagar data={data} reloadState={reloadState} initialView="edo_cuenta"/>} />
        <Route path="/facturacion" element={<Facturacion data={data} reloadState={reloadState}/>} />
        <Route path="/tienda" element={<TiendaB2B data={data} cart={cart} setCart={setCart} addCart={addCart} enviarPedido={enviarPedido}/>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
    </div>
  );
}

export default App;
