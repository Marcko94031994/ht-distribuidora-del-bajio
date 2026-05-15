const API_BASE_URL = 'http://localhost:5200/api';

// State Management
let state = {
    drivers: [],
    inventory: [],
    routes: [],
    summary: {
        activeRoutesCount: 0,
        deliveredPercentage: 0,
        comparisonText: '+0 vs prev. hour'
    },
    lastSync: null
};

// Global Fetcher
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        showToast(`Sync Error: ${error.message}`, 'error');
        console.error(`Fetch failed for ${endpoint}:`, error);
        return null;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'error' ? 'alert-circle' : 'info'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 5000);
}

// Sync Logic
async function syncAll() {
    const [drivers, inventory, routes, summary] = await Promise.all([
        fetchData('/drivers/active'),
        fetchData('/inventory'),
        fetchData('/routes/active'),
        fetchData('/dashboard/summary')
    ]);

    if (drivers) state.drivers = drivers;
    if (inventory) state.inventory = inventory;
    if (routes) state.routes = routes;
    if (summary) state.summary = summary;

    state.lastSync = new Date();
    updateUI();
}

function updateUI() {
    renderDrivers();
    renderInventory();
    renderMap();
    updateKPIs();
    updateSyncTimestamp();
}

function renderDrivers() {
    const list = document.getElementById('drivers-list');
    list.innerHTML = state.drivers.map(driver => `
        <div class="driver-item">
            <div class="driver-info">
                <span class="driver-name">${driver.name}</span>
                <span class="driver-status"></span>
            </div>
            <div class="driver-metrics">
                <div class="metric">
                    <span class="label">Fuel Eff.</span>
                    <span class="value">${driver.currentFuelEfficiency} km/L</span>
                </div>
                <div class="metric">
                    <span class="label">Stops</span>
                    <span class="value">${driver.totalStopsToday}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderInventory() {
    const body = document.getElementById('inventory-body');
    body.innerHTML = state.inventory.map(item => {
        const available = item.physicalStock - item.reservedStock;
        const colorClass = available < 10 ? 'danger-text' : 'success-text';
        return `
            <tr>
                <td>${item.product.name}</td>
                <td>${item.physicalStock}</td>
                <td>${item.reservedStock}</td>
                <td class="highlight-col ${colorClass}" style="color: ${available < 10 ? '#EF4444' : '#10B981'}">${available}</td>
            </tr>
        `;
    }).join('');
}

function updateKPIs() {
    const kpis = document.querySelectorAll('.stat-card');
    if (kpis[0]) {
        kpis[0].querySelector('.value').textContent = state.summary.activeRoutesCount;
        kpis[0].querySelector('.trend').textContent = state.summary.comparisonText;
    }
    if (kpis[1]) {
        kpis[1].querySelector('.value').textContent = `${state.summary.deliveredPercentage}%`;
        kpis[1].querySelector('.progress').style.width = `${state.summary.deliveredPercentage}%`;
    }
}

console.log("HT Logistics App.js Loaded - V10");

// Coordinate Scaling logic
function mapCoords(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return { x: 500, y: 350 };
    
    // LEON, GTO Ranges (Focused)
    const latMin = 21.05, latMax = 21.20;
    const lngMin = -101.75, lngMax = -101.55;

    // Scale to 0-1
    const sX = (lat - latMin) / (latMax - latMin);
    const sY = (lng - lngMin) / (lngMax - lngMin);

    return { 
        x: Math.max(0, Math.min(1000, sX * 1000)), 
        y: Math.max(0, Math.min(700, (1 - sY) * 700)) 
    };
}

function renderMap() {
    const root = document.getElementById('map-root');
    if (!root) return;

    let svgContent = `
        <svg viewBox="0 0 1000 700" width="100%" height="100%" style="background: #0d1117">
            <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#21262d" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="1000" height="700" fill="url(#grid)" />
            
            <!-- Dynamic Routes -->
            ${state.routes.map(route => {
                let pointsStr = "";
                try {
                    let pathData = route.optimizedPathJSON;
                    if (typeof pathData === 'string' && pathData.trim() !== '') {
                        try {
                            // First attempt: direct parse
                            pathData = JSON.parse(pathData);
                        } catch(e) {
                            // Second attempt: fix loose JSON (keys without quotes)
                            try {
                                const fixedJson = pathData
                                    .replace(/([{,]\s*)([a-z0-9A-Z_]+)\s*:/g, '$1"$2":') // Quote keys
                                    .replace(/'/g, '"'); // Replace single quotes with double quotes
                                pathData = JSON.parse(fixedJson);
                            } catch(e2) {
                                console.error("Final Path parse error", e2, pathData);
                                pathData = [];
                            }
                        }
                    }
                    
                    if (Array.isArray(pathData)) {
                        pointsStr = pathData.map(p => {
                            const {x, y} = mapCoords(p.lat || p.latitude, p.lng || p.longitude);
                            return `${x},${y}`;
                        }).join(' ');
                    }
                } catch(e) { console.error("Path parse error", e, route.optimizedPathJSON); }

                return pointsStr ? `
                    <polyline points="${pointsStr}" 
                        fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="8,4" opacity="0.6" />
                ` : '';
            }).join('')}

            <!-- Delivery Markers -->
            ${state.routes.flatMap(r => r.orders).map(order => {
                let color = order.status === 'Delivered' ? '#10B981' : order.status === 'InTransit' ? '#3B82F6' : '#EF4444';
                const {x, y} = mapCoords(order.destinationLatitude, order.destinationLongitude);
                return `
                    <g transform="translate(${x}, ${y})">
                        <circle r="12" fill="${color}" opacity="0.2" />
                        <circle r="6" fill="${color}" />
                        <text y="24" fill="#F3F4F6" font-size="12" font-weight="600" text-anchor="middle" style="pointer-events: none">
                            ${order.customerName}
                        </text>
                    </g>
                `;
            }).join('')}
        </svg>
    `;
    root.innerHTML = svgContent;
}

function updateSyncTimestamp() {
    const el = document.getElementById('sync-timestamp');
    if (state.lastSync) {
        el.textContent = `Last synced: ${state.lastSync.toLocaleTimeString()}`;
    }
}

function updateTime() {
    const el = document.getElementById('current-time');
    if (el) el.textContent = new Date().toLocaleString('es-MX').toUpperCase();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    syncAll();
    setInterval(syncAll, 60000); // Sync every minute
    setInterval(updateTime, 1000);
    lucide.createIcons();
});
