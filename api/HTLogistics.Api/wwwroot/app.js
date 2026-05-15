const API_BASE_URL = '/api';

// Global State
let state = {
    sucursales: [],
    almacenes: [],
    vendedores: [],
    rutas: [],
    productos: [],
    pedidos: [],
    compras: [],
    lastSync: null,
    currentTab: 'dashboard',
    selectedRuta: null,
    selectedCliente: null,
    selectedRemision: null,
    cart: []
};

// Utilities
const pesos = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);

// Global Fetcher
async function syncAll(skipRender = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/app/state`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const data = await response.json();
        
        Object.assign(state, data);
        state.lastSync = new Date();
        
        if (!state.selectedRuta && state.rutas.length > 0) {
            state.selectedRuta = state.rutas[0].id;
            if (state.rutas[0].clients && state.rutas[0].clients.length > 0) {
                state.selectedCliente = state.rutas[0].clients[0].id;
            }
        }
        
        if (!skipRender) {
            updateUI();
        }
    } catch (error) {
        showToast(`Error de conexión: ${error.message}`, 'error');
        console.error("Fetch failed:", error);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-triangle' : 'check-circle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 5000);
}

// Navigation Logic
const tabs = [
    { id: 'dashboard', label: 'Resumen Operativo', icon: 'bar-chart-2' },
    { id: 'sucursales', label: 'Sucursales / Almacenes', icon: 'building' },
    { id: 'rutas', label: 'Rutas / Vendedores', icon: 'map' },
    { id: 'torre', label: 'Torre de Control', icon: 'navigation' },
    { id: 'vendedor', label: 'App Vendedor', icon: 'smartphone' },
    { id: 'remisiones', label: 'Remisiones', icon: 'file-text' },
    { id: 'almacen', label: 'Inventario / Compras', icon: 'package' }
];

function initNav() {
    const nav = document.getElementById('nav-tabs');
    nav.innerHTML = tabs.map(t => `
        <a class="nav-item ${state.currentTab === t.id ? 'active' : ''}" data-tab="${t.id}">
            <i data-lucide="${t.icon}"></i> ${t.label}
        </a>
    `).join('');
    
    nav.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', (e) => {
            state.currentTab = e.currentTarget.dataset.tab;
            initNav(); // Re-render nav for active state
            updateUI();
        });
    });
    lucide.createIcons();
}

// Helpers to get entity by ID
const getSucursal = id => state.sucursales.find(x => x.id === id);
const getAlmacen = id => state.almacenes.find(x => x.id === id);
const getVendedor = id => state.vendedores.find(x => x.id === id);
const getProducto = id => state.productos.find(x => x.id === id);
const getRuta = id => state.rutas.find(x => x.id === id);

// Main UI Updater
function updateUI() {
    const titleEl = document.getElementById('page-title');
    const tabObj = tabs.find(t => t.id === state.currentTab);
    titleEl.textContent = tabObj ? tabObj.label : 'Dashboard';
    
    document.getElementById('header-actions').innerHTML = ''; // Clear actions
    
    const container = document.getElementById('tab-content');
    
    if (state.currentTab === 'dashboard') renderDashboard(container);
    if (state.currentTab === 'sucursales') renderSucursales(container);
    if (state.currentTab === 'rutas') renderRutas(container);
    if (state.currentTab === 'torre') renderTorre(container);
    if (state.currentTab === 'vendedor') renderVendedor(container);
    if (state.currentTab === 'remisiones') renderRemisiones(container);
    if (state.currentTab === 'almacen') renderAlmacen(container);
    
    document.getElementById('sync-timestamp').textContent = `Sincronizado: ${state.lastSync ? state.lastSync.toLocaleTimeString() : 'Nunca'}`;
    lucide.createIcons();
}

// ---------------------------------------------------------
// Tab Renderers
// ---------------------------------------------------------

function renderDashboard(container) {
    const totalInventory = state.productos.reduce((acc, p) => acc + p.stock, 0);
    const lowStock = state.productos.filter(p => p.stock <= 10).length;
    const invValue = state.productos.reduce((acc, p) => acc + (p.stock * p.price), 0);
    
    container.innerHTML = `
        <div class="kpi-row">
            <div class="kpi-card">
                <div class="kpi-label">Sucursales</div>
                <div class="kpi-value">${state.sucursales.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Rutas Activas</div>
                <div class="kpi-value">${state.rutas.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Pedidos Hoy</div>
                <div class="kpi-value">${state.pedidos.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Inventario Total</div>
                <div class="kpi-value">${totalInventory} pzs</div>
            </div>
        </div>
        
        <div class="grid grid-2">
            <div class="card">
                <div class="card-h">
                    <h3><i data-lucide="shopping-cart"></i> Pedidos Recientes</h3>
                </div>
                <div class="card-b list">
                    ${state.pedidos.map(p => `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${p.orderNumber}</strong>
                                <span class="chip ${p.status === 'Pendiente' ? 'danger' : 'info'}">${p.status}</span>
                            </div>
                            <div class="muted-text">${p.time || ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="card">
                <div class="card-h">
                    <h3><i data-lucide="package"></i> Estado del Almacén</h3>
                </div>
                <div class="card-b">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <div>
                            <div class="muted-text">Valor Aproximado</div>
                            <strong style="font-size:1.5rem">${pesos(invValue)}</strong>
                        </div>
                        <div>
                            <div class="muted-text">Bajo Stock</div>
                            <strong style="font-size:1.5rem; color:var(--danger)">${lowStock} items</strong>
                        </div>
                    </div>
                    <table style="width:100%">
                        <tr><th>Producto</th><th>Stock</th><th>Valor</th></tr>
                        ${state.productos.slice(0,5).map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td><span class="${p.stock <= 10 ? 'chip danger' : ''}">${p.stock}</span></td>
                                <td>${pesos(p.stock * p.price)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderSucursales(container) {
    container.innerHTML = `
        <div class="grid grid-2">
            <div class="card">
                <div class="card-h"><h3>Sucursales</h3></div>
                <div class="card-b list">
                    ${state.sucursales.map(s => {
                        const count = state.almacenes.filter(a => a.branchId === s.id).length;
                        return `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${s.name}</strong>
                                <span class="chip info">${count} almacenes</span>
                            </div>
                            <div class="muted-text">Gerente: ${s.manager}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-h"><h3>Almacenes</h3></div>
                <div class="card-b list">
                    ${state.almacenes.map(a => `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${a.name}</strong>
                                <span class="chip ${a.type==='Principal'?'success':'warning'}">${a.type}</span>
                            </div>
                            <div class="muted-text">Sucursal: ${getSucursal(a.branchId)?.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderRutas(container) {
    container.innerHTML = `
        <div class="grid grid-2">
            <div class="card">
                <div class="card-h"><h3>Rutas Asignadas</h3></div>
                <div class="card-b list">
                    ${state.rutas.map(r => `
                        <div class="list-item" onclick="state.selectedRuta=${r.id}; updateUI()">
                            <div class="row-between">
                                <strong>${r.name}</strong>
                                <span class="chip info">${r.dayOfWeek}</span>
                            </div>
                            <div class="muted-text">Vendedor: ${getVendedor(r.driverId)?.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-h"><h3>Fuerza de Ventas</h3></div>
                <div class="card-b list">
                    ${state.vendedores.map(v => `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${v.name}</strong>
                                <span class="chip success">${v.status}</span>
                            </div>
                            <div class="muted-text">Unidad: ${v.assignedVehicleId || 'N/A'} · Tel: ${v.phone}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Coordinate Scaling logic for Map
function mapCoords(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return { x: 50, y: 50 };
    // León / Silao Range approximation
    const latMin = 20.9, latMax = 21.20;
    const lngMin = -101.75, lngMax = -101.4;
    const sX = (lng - lngMin) / (lngMax - lngMin);
    const sY = (lat - latMin) / (latMax - latMin);
    return { x: sX * 100, y: (1 - sY) * 100 }; // 0-100%
}

function renderVendedor(container) {
    const ruta = getRuta(state.selectedRuta);
    if (!ruta) {
        container.innerHTML = `<div class="card"><div class="card-b">Selecciona una ruta primero.</div></div>`;
        return;
    }
    
    // Auto-select client if none
    if (!state.selectedCliente && ruta.clients && ruta.clients.length > 0) {
        state.selectedCliente = ruta.clients[0].id;
    }
    const cliente = ruta.clients?.find(c => c.id === state.selectedCliente);

    // Remove mapSVG logic
    container.innerHTML = `
        <div class="grid grid-seller">
            <!-- Left: Clientes -->
            <div class="card">
                <div class="card-h">
                    <h3>Secuencia de visita</h3>
                    <span class="chip info">${ruta.name}</span>
                </div>
                <div class="card-b list" style="max-height: 600px; overflow-y:auto;">
                    ${ruta.clients?.map((c, i) => `
                        <div class="list-item ${c.id === state.selectedCliente ? 'active' : ''}" onclick="state.selectedCliente=${c.id}; updateUI()">
                            <div class="row-between">
                                <strong>${i+1}. ${c.name}</strong>
                                <span class="chip ${c.isVisited ? 'success' : 'warning'}">${c.isVisited ? 'Visitado' : 'Pendiente'}</span>
                            </div>
                            <div class="muted-text">${c.zone}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Middle: Map & Cart -->
            <div class="card">
                <div class="card-h">
                    <h3>Levantamiento de pedido</h3>
                </div>
                <div class="card-b">
                    <div class="mini-map" style="height:250px; margin-bottom:20px; position:relative; overflow:hidden;">
                        <div id="vendedor-gmap" style="width:100%; height:100%;"></div>
                        ${cliente ? `<div style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.8); padding:8px 12px; border-radius:8px; border:1px solid var(--border); z-index:10;">
                            <strong>${cliente.name}</strong>
                        </div>` : ''}
                    </div>
                    
                    <div class="form-grid" style="margin-bottom:20px;">
                        <select id="prodSelect" class="select full-col">
                            ${state.productos.map(p => `<option value="${p.id}">${p.name} (Disp: ${p.stock}) - ${pesos(p.price)}</option>`).join('')}
                        </select>
                        <input type="number" id="qtyInput" class="input" value="1" min="1">
                        <button class="btn btn-primary" onclick="addToCart()">Añadir</button>
                    </div>
                    
                    <table style="width:100%; margin-bottom: 20px;">
                        <tr><th>Prod</th><th>Cant</th><th>Subt</th></tr>
                        ${state.cart.map((item, idx) => {
                            const p = getProducto(item.productId);
                            return `<tr>
                                <td>${p?.name}</td>
                                <td>${item.qty}</td>
                                <td>${pesos(p?.price * item.qty)} <button class="btn-secondary" style="padding:2px 8px; border-radius:4px; border:0; margin-left:10px; cursor:pointer;" onclick="state.cart.splice(${idx},1); updateUI()">X</button></td>
                            </tr>`;
                        }).join('')}
                    </table>
                    
                    ${state.cart.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <label class="muted-text" style="display:block; margin-bottom:8px;">Evidencia Fotográfica</label>
                            <input type="file" id="orderPhoto" class="input" accept="image/*" capture="environment" style="background: rgba(255,255,255,0.05);">
                        </div>
                        <button class="btn btn-success" style="width:100%" onclick="submitOrder()">Enviar Pedido</button>
                    ` : ''}
                    
                    <div style="margin-top: 30px; border-top: 1px solid var(--border); padding-top: 20px;">
                        <button class="btn btn-primary" style="width:100%; background: var(--danger);" onclick="reportIncident()">Reportar Contratiempo</button>
                    </div>
                </div>
            </div>
            
            <!-- Right: Inventory & Delivery -->
            <div class="card">
                <div class="card-h" style="display:flex; flex-direction:column; align-items:flex-start; gap:10px;">
                    <div style="width:100%; display:flex; justify-content:space-between;">
                        <h3>Entrega Final</h3>
                    </div>
                </div>
                <div class="card-b" style="padding:15px; border-bottom: 1px solid var(--border); background:rgba(0,0,0,0.2);">
                    ${(() => {
                        if (!cliente) return '<div class="muted-text">Selecciona un cliente.</div>';
                        const activeOrder = state.pedidos.find(p => p.clientId === cliente.id && p.status === 'En remisión');
                        if (!activeOrder) return '<div class="muted-text">No hay pedidos listos para entrega.</div>';
                        
                        return `
                            <div style="margin-bottom:15px;">
                                <strong style="color:var(--warning)">Entrega Pendiente: ${activeOrder.orderNumber}</strong>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label class="muted-text" style="display:block; margin-bottom:8px;">Evidencia de Entrega Física</label>
                                <input type="file" id="deliveryPhoto" class="input" accept="image/*" capture="environment" style="background: rgba(255,255,255,0.05);">
                            </div>
                            <button class="btn btn-success" style="width:100%" onclick="completeDelivery(${activeOrder.id})">Marcar como Entregado</button>
                        `;
                    })()}
                </div>
                
                <div class="card-h" style="margin-top: 20px;">
                    <h3>Existencias Móvil</h3>
                </div>
                <div class="card-b list">
                    ${state.productos.map(p => `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${p.name}</strong>
                                <span class="chip ${p.stock > 10 ? 'success' : 'danger'}">${p.stock}</span>
                            </div>
                            <div class="muted-text">${pesos(p.price)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    setTimeout(initVendedorMap, 100);
}

let globalVendedorMap = null;
let vendedorMarkers = [];
let vendedorPolyline = null;

function initVendedorMap() {
    if (!window.google) return;
    
    const ruta = getRuta(state.selectedRuta);
    if (!ruta || !ruta.clients || ruta.clients.length === 0) return;
    
    // Focus on first client
    const centerLat = ruta.clients[0].latitude;
    const centerLng = ruta.clients[0].longitude;
    
    if (!globalVendedorMap) {
        globalVendedorMap = new google.maps.Map(document.getElementById('vendedor-gmap'), {
            center: { lat: centerLat, lng: centerLng },
            zoom: 13,
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
                { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }
            ],
            disableDefaultUI: true
        });
    } else {
        document.getElementById('vendedor-gmap').appendChild(globalVendedorMap.getDiv());
        globalVendedorMap.setCenter({ lat: centerLat, lng: centerLng });
    }
    
    // Clear old elements
    vendedorMarkers.forEach(m => m.setMap(null));
    vendedorMarkers = [];
    if (vendedorPolyline) vendedorPolyline.setMap(null);
    
    // Draw Polyline
    if (ruta.optimizedPathJSON) {
        try {
            const path = JSON.parse(ruta.optimizedPathJSON);
            vendedorPolyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#3b82f6',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                map: globalVendedorMap
            });
        } catch(e) {}
    }
    
    // Draw Clients
    ruta.clients.forEach((c, i) => {
        const isActive = state.selectedCliente === c.id;
        const color = isActive ? '#3b82f6' : (c.isVisited ? '#10b981' : '#f59e0b');
        
        const marker = new google.maps.Marker({
            position: { lat: c.latitude, lng: c.longitude },
            map: globalVendedorMap,
            title: c.name,
            label: { text: (i+1).toString(), color: '#ffffff', fontSize: '10px' },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: isActive ? 12 : 8,
                fillColor: color,
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }
        });
        
        marker.addListener('click', () => {
            state.selectedCliente = c.id;
            updateUI();
        });
        
        vendedorMarkers.push(marker);
    });
}

window.addToCart = function() {
    const pId = parseInt(document.getElementById('prodSelect').value);
    const qty = parseInt(document.getElementById('qtyInput').value);
    if (!pId || qty < 1) return;
    
    const existing = state.cart.find(x => x.productId === pId);
    if (existing) {
        existing.qty += qty;
    } else {
        state.cart.push({ productId: pId, qty: qty });
    }
    updateUI();
};

window.submitOrder = async function() {
    if (state.cart.length === 0) return;
    
    const fileInput = document.getElementById('orderPhoto');
    let base64 = null;
    
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    const ruta = getRuta(state.selectedRuta);
    
    const payload = {
        clientId: state.selectedCliente,
        routeId: ruta.id,
        driverId: ruta.driverId,
        photoBase64: base64,
        items: state.cart.map(i => ({ productId: i.productId, quantity: i.qty }))
    };

    try {
        const response = await fetch(`${API_BASE_URL}/app/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Error al guardar en BD");
        
        showToast("Pedido enviado a remisión con evidencia", "success");
        state.cart = [];
        await syncAll(); 
    } catch(e) {
        showToast("Error: " + e.message, "error");
    }
};

window.reportIncident = async function() {
    const ruta = getRuta(state.selectedRuta);
    if (!ruta) return;
    
    const reason = prompt("Describe el contratiempo (ej. Ponchadura, Tráfico pesado):");
    if (!reason) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/app/incident`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: ruta.driverId, reason: reason })
        });
        
        if (!response.ok) throw new Error("Error al reportar");
        showToast("Contratiempo reportado a la Torre de Control", "warning");
        await syncAll();
    } catch(e) {
        showToast("Error: " + e.message, "error");
    }
};

window.completeDelivery = async function(orderId) {
    const fileInput = document.getElementById('deliveryPhoto');
    let base64 = null;
    
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/app/complete-delivery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId, photoBase64: base64 })
        });
        
        if (!response.ok) throw new Error("Error al completar entrega");
        showToast("¡Entrega marcada como completada!", "success");
        await syncAll();
    } catch(e) {
        showToast("Error: " + e.message, "error");
    }
};

// --- Torre de Control (Google Maps) ---
let globalGoogleMap = null;
let googleMarkers = [];

window.initGoogleMap = function() {
    // Called by Google Maps SDK when loaded
    console.log("Google Maps API Loaded");
};

function renderTorre(container) {
    container.innerHTML = `
        <div class="grid grid-dashboard" style="height: calc(100vh - 120px)">
            <div class="card" style="display:flex; flex-direction:column;">
                <div class="card-h">
                    <h3><i data-lucide="radio"></i> Alertas y Estatus</h3>
                </div>
                <div class="card-b list" style="flex:1; overflow-y:auto;" id="alerts-list">
                    <!-- Alerts injected here -->
                </div>
            </div>
            
            <div class="card" style="padding:0; overflow:hidden; position:relative;">
                <div id="gmap" style="width:100%; height:100%;"></div>
                <div style="position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.8); padding:10px 15px; border-radius:8px; border:1px solid var(--border); z-index:10;">
                    <strong style="color:var(--success)">■</strong> Entregado &nbsp;
                    <strong style="color:var(--text-muted)">■</strong> Pendiente &nbsp;
                    <strong style="color:var(--danger)">■</strong> Contratiempo
                </div>
            </div>
        </div>
    `;
    
    setTimeout(initTorreMap, 100);
}

function initTorreMap() {
    if (!window.google) {
        document.getElementById('gmap').innerHTML = '<div style="padding:40px; text-align:center;">Cargando Google Maps API... Asegúrate de usar una llave válida.</div>';
        return;
    }
    
    if (!globalGoogleMap) {
        globalGoogleMap = new google.maps.Map(document.getElementById('gmap'), {
            center: { lat: 21.122, lng: -101.683 }, // León, Gto
            zoom: 12,
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
                { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }
            ],
            disableDefaultUI: true
        });
    } else {
        // Re-attach to new DOM element
        document.getElementById('gmap').appendChild(globalGoogleMap.getDiv());
    }
    
    updateTorreMap();
}

function updateTorreMap() {
    if (!globalGoogleMap) return;
    
    // Clear old markers
    googleMarkers.forEach(m => m.setMap(null));
    googleMarkers = [];
    
    const alertsList = document.getElementById('alerts-list');
    let alertsHtml = '';
    
    state.rutas.forEach(ruta => {
        const driver = getVendedor(ruta.driverId);
        
        // Draw Driver
        if (driver && driver.latitude) {
            const isAlert = driver.hasIncident;
            if (isAlert) {
                alertsHtml += `
                    <div class="list-item" style="border-color:var(--danger); background:rgba(239, 68, 68, 0.1);">
                        <div class="row-between">
                            <strong style="color:var(--danger)">¡Alerta en Ruta!</strong>
                            <span class="chip danger">${ruta.name}</span>
                        </div>
                        <div class="muted-text">Vendedor: ${driver.name}</div>
                        <div style="margin-top:8px; font-weight:bold;">Razón: ${driver.incidentReason}</div>
                    </div>
                `;
            } else {
                alertsHtml += `
                    <div class="list-item">
                        <div class="row-between">
                            <strong>${ruta.name}</strong>
                            <span class="chip info">Activa</span>
                        </div>
                        <div class="muted-text">Vendedor: ${driver.name}</div>
                    </div>
                `;
            }
            
            const driverMarker = new google.maps.Marker({
                position: { lat: driver.latitude, lng: driver.longitude },
                map: globalGoogleMap,
                title: driver.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: isAlert ? '#ef4444' : '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2
                }
            });
            googleMarkers.push(driverMarker);
        }
        
        // Draw Clients
        ruta.clients?.forEach(c => {
            const clientMarker = new google.maps.Marker({
                position: { lat: c.latitude, lng: c.longitude },
                map: globalGoogleMap,
                title: c.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: c.isVisited ? '#10b981' : '#9ca3af',
                    fillOpacity: 0.8,
                    strokeColor: '#fff',
                    strokeWeight: 1
                }
            });
            googleMarkers.push(clientMarker);
        });
    });
    
    if (alertsList) alertsList.innerHTML = alertsHtml || '<div class="muted-text">Sin actividad registrada.</div>';
}

function renderRemisiones(container) {
    const orderDetails = state.pedidos.find(p => p.id === state.selectedRemision);
    
    container.innerHTML = `
        <div class="grid grid-2">
            <div class="card">
                <div class="card-h"><h3>Cola de Pedidos</h3></div>
                <div class="card-b list" style="max-height:600px; overflow-y:auto;">
                    ${state.pedidos.map(p => {
                        const c = state.rutas.flatMap(r => r.clients).find(x => x && x.id === p.clientId);
                        const isSelected = state.selectedRemision === p.id;
                        let color = 'info';
                        if (p.status === 'Pendiente') color = 'danger';
                        if (p.status === 'En remisión') color = 'warning';
                        if (p.status === 'Entregado') color = 'success';
                        
                        return `
                        <div class="list-item ${isSelected ? 'active' : ''}" style="cursor:pointer" onclick="state.selectedRemision=${p.id}; updateUI()">
                            <div class="row-between">
                                <strong>${p.orderNumber}</strong>
                                <span class="chip ${color}">${p.status}</span>
                            </div>
                            <div class="muted-text">${c?.name || 'Cliente'}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-h"><h3>Flujo Operativo</h3></div>
                <div class="card-b">
                    ${!orderDetails ? `
                        <p class="muted-text" style="line-height:1.6; margin-bottom:20px;">
                            Esta pantalla permite a despachadores autorizar pedidos que llegan desde la "App Vendedor".
                            Aquí se convierten los pedidos en <strong>Remisiones</strong> separando el inventario físico en el almacén.
                        </p>
                        <div style="padding:20px; border-radius:var(--radius-md); border:1px dashed var(--border); text-align:center;">
                            Selecciona un pedido de la izquierda para generar la remisión.
                        </div>
                    ` : `
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                                <h2>${orderDetails.orderNumber}</h2>
                                <span class="chip ${orderDetails.status === 'Pendiente' ? 'danger' : 'info'}">${orderDetails.status}</span>
                            </div>
                            
                            <table style="width:100%; margin-bottom: 20px;">
                                <tr><th>Producto</th><th>Cant. Solicitada</th></tr>
                                ${orderDetails.items ? orderDetails.items.map(i => {
                                    const p = getProducto(i.productId);
                                    return `<tr><td>${p?.name || 'Item'}</td><td>${i.quantity}</td></tr>`;
                                }).join('') : ''}
                            </table>
                            
                            <div style="display:flex; gap:10px; margin-bottom: 20px; overflow-x:auto;">
                                ${orderDetails.photoBase64 ? `
                                    <div style="flex:1;">
                                        <div class="muted-text" style="margin-bottom:5px;">Evidencia de Levantamiento</div>
                                        <img src="${orderDetails.photoBase64}" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; border:1px solid var(--border);" alt="Levantamiento">
                                    </div>
                                ` : ''}
                                ${orderDetails.deliveryPhotoBase64 ? `
                                    <div style="flex:1;">
                                        <div class="muted-text" style="margin-bottom:5px;">Evidencia de Entrega</div>
                                        <img src="${orderDetails.deliveryPhotoBase64}" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; border:1px solid var(--border);" alt="Entrega">
                                    </div>
                                ` : ''}
                            </div>
                            
                            ${orderDetails.status === 'Pendiente' ? `
                                <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border);">
                                    <button class="btn btn-success" style="width:100%" onclick="authorizeOrder(${orderDetails.id})">Autorizar Remisión (Descontar Inventario)</button>
                                </div>
                            ` : ''}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

window.authorizeOrder = async function(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/app/authorize-order/${id}`, { method: 'POST' });
        if (!response.ok) throw new Error("Error al autorizar pedido");
        showToast("Pedido autorizado. Inventario descontado.", "success");
        await syncAll();
    } catch(e) {
        showToast(e.message, "error");
    }
};

function renderAlmacen(container) {
    container.innerHTML = `
        <div class="grid grid-2">
            <div class="card">
                <div class="card-h"><h3>Órdenes de Compra</h3></div>
                <div class="card-b list">
                    ${state.compras.map(c => `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${c.poNumber}</strong>
                                <span class="chip ${c.status==='Autorizada'?'success':'warning'}">${c.status}</span>
                            </div>
                            <div class="row-between" style="margin-top:8px">
                                <span>${getProducto(c.productId)?.name}</span>
                                <strong>${c.quantity} pzs</strong>
                            </div>
                            <div class="muted-text">${c.provider} · ${pesos(c.quantity * c.cost)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-h"><h3>Existencias Físicas</h3></div>
                <div class="card-b list">
                    ${state.productos.map(p => `
                        <div class="list-item">
                            <div class="row-between">
                                <strong>${p.name}</strong>
                                <strong>${p.stock}</strong>
                            </div>
                            <div class="muted-text">${getAlmacen(p.warehouseId)?.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function updateTime() {
    const el = document.getElementById('current-time');
    if (el) el.textContent = new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' }).toUpperCase();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    syncAll();
    setInterval(updateTime, 1000);
    
    // Live Polling for Control Tower
    setInterval(async () => {
        if (state.currentTab === 'torre') {
            await syncAll(true); // Don't trigger full DOM rebuild
            updateTorreMap(); // Only update map and sidebar
            document.getElementById('sync-timestamp').textContent = `Sincronizado: ${state.lastSync ? state.lastSync.toLocaleTimeString() : 'Nunca'}`;
        }
    }, 5000); // 5 seconds polling
});
