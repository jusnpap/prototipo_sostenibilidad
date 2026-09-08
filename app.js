// Global State
let inventory = [];
let cart = [];
let currentUser = null;
let sessionSalesTotal = 0;

// DOM Elements
const views = document.querySelectorAll('.view-section');
const navLinks = document.querySelectorAll('.nav-links li');
const viewTitle = document.getElementById('view-title');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetView = link.getAttribute('data-view');
            switchView(targetView, link);
        });
    });

    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', logout);

    // Modals
    document.getElementById('btn-add-product').addEventListener('click', () => openProductModal());
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            closeProductModal();
            document.getElementById('delete-modal').classList.remove('show');
            document.getElementById('ticket-modal').classList.remove('show');
            document.getElementById('cierre-modal').classList.remove('show');
        });
    });

    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    
    // Delete Modal
    document.getElementById('cancel-delete').addEventListener('click', () => document.getElementById('delete-modal').classList.remove('show'));
    document.getElementById('delete-form').addEventListener('submit', confirmDeleteProduct);

    // POS
    document.getElementById('pos-search').addEventListener('input', (e) => filterPosProducts(e.target.value));
    document.getElementById('inv-search').addEventListener('input', (e) => filterInventory(e.target.value));
    document.getElementById('btn-clear-cart').addEventListener('click', clearCart);
    document.getElementById('btn-checkout').addEventListener('click', processSale);
    
    document.getElementById('close-payment-modal').addEventListener('click', () => {
        document.getElementById('payment-modal').classList.remove('show');
    });

    // Ticket & Cierre
    document.getElementById('close-ticket-modal').addEventListener('click', () => document.getElementById('ticket-modal').classList.remove('show'));
    document.getElementById('btn-print-ticket').addEventListener('click', () => window.print());
    
    document.getElementById('btn-close-register').addEventListener('click', openCierreModal);
    document.getElementById('cancel-cierre').addEventListener('click', () => document.getElementById('cierre-modal').classList.remove('show'));
    document.getElementById('confirm-cierre').addEventListener('click', confirmCierreCaja);
    document.getElementById('egreso-form').addEventListener('submit', handleEgresoSubmit);
});

// Authentication
function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    if (user === 'admin' && pass === 'admin123') {
        currentUser = { username: 'Admin', role: 'admin' };
    } else if (user === 'vendedor' && pass === 'vendedor123') {
        currentUser = { username: 'Vendedor', role: 'vendedor' };
    } else {
        showToast('Credenciales incorrectas', 'error');
        return;
    }

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('current-user-display').innerText = currentUser.username;
    
    sessionSalesTotal = 0;
    applyPermissions();
    logAction('Inicio de sesión', `El usuario ${currentUser.username} ingresó al sistema.`);
}

function logout() {
    logAction('Cierre de sesión', `El usuario ${currentUser.username} salió del sistema.`);
    currentUser = null;
    clearCart();
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('login-form').reset();
}

function applyPermissions() {
    const navDash = document.getElementById('nav-dashboard');
    const navLogs = document.getElementById('nav-logs');
    const navPos = document.getElementById('nav-pos');
    
    if (currentUser.role === 'vendedor') {
        navDash.style.display = 'none';
        navLogs.style.display = 'none';
        switchView('pos', navPos);
    } else {
        navDash.style.display = 'flex';
        navLogs.style.display = 'flex';
        switchView('dashboard', navDash);
    }
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('datetime-display').innerText = now.toLocaleString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function switchView(viewId, activeLink) {
    navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
    
    views.forEach(view => view.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    const titleMap = {
        'dashboard': 'Dashboard Principal',
        'pos': 'Punto de Venta (Caja)',
        'inventory': 'Gestión de Inventario',
        'logs': 'Registro de Actividad'
    };
    viewTitle.innerText = titleMap[viewId];

    if(viewId === 'inventory' || viewId === 'pos') {
        loadInventory();
    } else if (viewId === 'dashboard') {
        loadDashboardData();
    } else if (viewId === 'logs') {
        loadLogs();
    }
}

// API Calls
async function fetchAPI(endpoint, method = 'GET', body = null) {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`/api/${endpoint}`, options);
        if (!res.ok) {
            try {
                const errorData = await res.json();
                console.error("SERVER ERROR DETAILS:", errorData);
            } catch (e) {
                console.error("SERVER ERROR (Not JSON):", res.status);
            }
            throw new Error('API Error');
        }
        return await res.json();
    } catch (err) {
        showToast('Error de conexión con el servidor en la nube', 'error');
        console.error(err);
        return null;
    }
}

async function loadDashboardData() {
    const data = await fetchAPI('dashboard');
    if(!data) return;

    document.getElementById('dash-sales-today').innerText = `$${data.todays_sales.toFixed(2)}`;
    document.getElementById('dash-cash-balance').innerText = `$${data.cash_balance.toFixed(2)}`;
    document.getElementById('dash-stock-alerts').innerText = data.low_stock_alerts.length;
    document.getElementById('dash-expiry-alerts').innerText = data.expiring_soon_alerts.length;

    renderTable('low-stock-table', data.low_stock_alerts, (item) => `
        <tr>
            <td>${item.name}</td>
            <td><span class="status-badge status-danger">${item.stock}</span></td>
            <td>${item.min_stock}</td>
        </tr>
    `);

    renderTable('expiry-table', data.expiring_soon_alerts, (item) => `
        <tr>
            <td>${item.name}</td>
            <td><span class="status-badge status-warning">${item.expiry_date}</span></td>
            <td>${item.stock}</td>
        </tr>
    `);
}

async function loadInventory() {
    const data = await fetchAPI('products');
    if(data) {
        inventory = data;
        renderInventoryList(inventory);
        renderPosProducts(inventory);
        
        // Detect expired items for audit log
        const today = new Date().toISOString().split('T')[0];
        data.forEach(p => {
            if (p.expiry_date && p.expiry_date < today) {
                // To avoid spamming, we could log it only if not logged recently, but for now we just log
                // logAction('Producto Vencido', `El producto ${p.name} caducó el ${p.expiry_date}`);
            }
        });
    }
}

async function loadLogs() {
    const logs = await fetchAPI('logs');
    if (logs) {
        renderTable('logs-list', logs, (log) => {
            const date = new Date(log.date);
            const dateStr = date.toLocaleString('es-ES');
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${log.action}</strong></td>
                    <td><ion-icon name="person-circle-outline"></ion-icon> ${log.user}</td>
                    <td>${log.reason}</td>
                </tr>
            `;
        }, 'view-logs');
    }
}

async function logAction(action, reason) {
    await fetchAPI('logs', 'POST', {
        action: action,
        user: currentUser ? currentUser.username : 'Sistema',
        reason: reason
    });
}

// Inventory Logic
function renderInventoryList(products) {
    const tbody = document.getElementById('inventory-list');
    tbody.innerHTML = '';
    products.forEach(p => {
        const stockClass = p.stock <= p.min_stock ? 'status-danger' : 'status-success';
        tbody.innerHTML += `
            <tr>
                <td>#${p.id}</td>
                <td>${p.name}</td>
                <td>$${p.cost_price.toFixed(2)}</td>
                <td>$${p.sale_price.toFixed(2)}</td>
                <td><span class="status-badge ${p.stock <= p.min_stock ? 'status-danger' : ''}" style="${p.stock > p.min_stock ? 'background:rgba(16,185,129,0.2); color:#6ee7b7' : ''}">${p.stock}</span></td>
                <td>${p.expiry_date || '-'}</td>
                <td>
                    <button class="btn-icon" onclick="editProduct('${p.id}')"><ion-icon name="create-outline"></ion-icon></button>
                    <button class="btn-icon" style="color:var(--danger-color)" onclick="deleteProduct('${p.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                </td>
            </tr>
        `;
    });
}

function filterInventory(query) {
    const filtered = inventory.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    renderInventoryList(filtered);
}

function openProductModal(product = null) {
    document.getElementById('product-modal').classList.add('show');
    document.getElementById('prod-reason').value = '';
    
    if (product) {
        document.getElementById('modal-title').innerText = 'Editar Producto';
        document.getElementById('prod-id').value = product.id;
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-cost').value = product.cost_price;
        document.getElementById('prod-price').value = product.sale_price;
        document.getElementById('prod-stock').value = product.stock;
        document.getElementById('prod-min-stock').value = product.min_stock;
        document.getElementById('prod-expiry').value = product.expiry_date || '';
    } else {
        document.getElementById('modal-title').innerText = 'Agregar Producto';
        document.getElementById('product-form').reset();
        document.getElementById('prod-id').value = '';
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('show');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const reason = document.getElementById('prod-reason').value;
    
    const data = {
        name: name,
        cost_price: parseFloat(document.getElementById('prod-cost').value),
        sale_price: parseFloat(document.getElementById('prod-price').value),
        stock: parseInt(document.getElementById('prod-stock').value),
        min_stock: parseInt(document.getElementById('prod-min-stock').value),
        expiry_date: document.getElementById('prod-expiry').value
    };

    let result;
    if (id) {
        result = await fetchAPI(`products/${id}`, 'PUT', data);
        logAction('Editar Producto', `Producto ${name} editado. Razón: ${reason}`);
    } else {
        result = await fetchAPI('products', 'POST', data);
        logAction('Agregar Producto', `Producto ${name} agregado. Razón: ${reason}`);
    }

    if (result) {
        showToast(id ? 'Producto actualizado' : 'Producto agregado', 'success');
        closeProductModal();
        loadInventory();
        loadDashboardData();
    }
}

async function editProduct(id) {
    const product = inventory.find(p => p.id == id);
    if(product) openProductModal(product);
}

async function deleteProduct(id) {
    const product = inventory.find(p => p.id == id);
    if(product) {
        document.getElementById('delete-prod-id').value = id;
        document.getElementById('delete-reason').value = '';
        document.getElementById('delete-modal').classList.add('show');
    }
}

async function confirmDeleteProduct(e) {
    e.preventDefault();
    const id = document.getElementById('delete-prod-id').value;
    const reason = document.getElementById('delete-reason').value;
    const product = inventory.find(p => p.id == id);
    
    if (product) {
        const result = await fetchAPI(`products/${id}`, 'DELETE');
        if(result) {
            logAction('Eliminar Producto', `Producto ${product.name} eliminado. Razón: ${reason}`);
            showToast('Producto eliminado', 'success');
            document.getElementById('delete-modal').classList.remove('show');
            loadInventory();
            loadDashboardData();
        }
    }
}

// POS Logic
function renderPosProducts(products) {
    const grid = document.getElementById('pos-product-list');
    grid.innerHTML = '';
    products.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="addToCart('${p.id}')">
                <h4>${p.name}</h4>
                <div class="price">$${p.sale_price.toFixed(2)}</div>
                <div class="stock">Stock disponible: ${p.stock}</div>
            </div>
        `;
    });
}

function filterPosProducts(query) {
    const filtered = inventory.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    renderPosProducts(filtered);
}

function addToCart(productId) {
    const product = inventory.find(p => p.id == productId);
    if (!product) return;
    
    if (product.stock <= 0) {
        showToast('Producto sin stock', 'error');
        return;
    }

    const existing = cart.find(item => item.product_id == productId);
    if (existing) {
        if(existing.quantity >= product.stock) {
            showToast('Stock máximo alcanzado', 'error');
            return;
        }
        existing.quantity++;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            price: product.sale_price,
            quantity: 1
        });
    }
    renderCart();
}

function updateCartQty(productId, delta) {
    const item = cart.find(i => i.product_id == productId);
    const product = inventory.find(p => p.id == productId);
    
    if(item) {
        if (delta > 0 && item.quantity >= product.stock) {
            showToast('Stock máximo alcanzado', 'error');
            return;
        }
        
        item.quantity += delta;
        if(item.quantity <= 0) {
            cart = cart.filter(i => i.product_id != productId);
        }
        renderCart();
    }
}

function clearCart() {
    cart = [];
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding-top:20px;">El carrito está vacío</div>';
    }

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h5>${item.name}</h5>
                    <p>$${item.price.toFixed(2)} c/u</p>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.product_id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.product_id}', 1)">+</button>
                </div>
                <div class="item-total">$${subtotal.toFixed(2)}</div>
            </div>
        `;
    });

    document.getElementById('cart-subtotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

function processSale() {
    if(cart.length === 0) {
        showToast('El carrito está vacío', 'error');
        return;
    }
    document.getElementById('payment-modal').classList.add('show');
}

async function confirmPayment(method) {
    document.getElementById('payment-modal').classList.remove('show');
    
    const result = await fetchAPI('sales', 'POST', { items: cart, payment_method: method });
    if(result) {
        showToast(`Venta procesada exitosamente (${method})`, 'success');
        
        let total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        sessionSalesTotal += total;
        
        logAction('Venta Realizada', `Venta procesada por $${total.toFixed(2)} (${method})`);
        
        showTicketModal(cart, total);
        
        clearCart();
        loadInventory(); // Refresh stock
        loadDashboardData(); // Refresh metrics
    }
}

function showTicketModal(soldItems, total) {
    const modal = document.getElementById('ticket-modal');
    const itemsContainer = document.getElementById('ticket-items');
    
    document.getElementById('ticket-date').innerText = `Fecha: ${new Date().toLocaleString('es-ES')}`;
    document.getElementById('ticket-vendor').innerText = currentUser.username;
    document.getElementById('ticket-total').innerText = `$${total.toFixed(2)}`;
    
    itemsContainer.innerHTML = '';
    soldItems.forEach(item => {
        itemsContainer.innerHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });
    
    modal.classList.add('show');
}

let currentCashflowNet = 0;

async function openCierreModal() {
    document.getElementById('cierre-modal').classList.add('show');
    
    // Fetch today's cashflow
    const data = await fetchAPI('cashflow');
    if (data) {
        let totalIn = 0;
        let totalOut = 0;
        
        renderTable('cashflow-list', data, (item) => {
            const time = new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const isIngreso = item.transaction_type === 'IN';
            const color = isIngreso ? 'var(--success-color)' : 'var(--danger-color)';
            const sign = isIngreso ? '+' : '-';
            
            if (isIngreso) totalIn += item.amount;
            else totalOut += item.amount;
            
            return `
                <tr>
                    <td style="padding: 5px;">${time}</td>
                    <td style="padding: 5px;">${item.reason}</td>
                    <td style="padding: 5px; color: ${color}; font-weight: bold;">${sign}$${item.amount.toFixed(2)}</td>
                </tr>
            `;
        });

        currentCashflowNet = totalIn - totalOut;
        
        document.getElementById('cierre-in').innerText = `$${totalIn.toFixed(2)}`;
        document.getElementById('cierre-out').innerText = `$${totalOut.toFixed(2)}`;
        document.getElementById('cierre-neto').innerText = `$${currentCashflowNet.toFixed(2)}`;
    }
}

async function handleEgresoSubmit(e) {
    e.preventDefault();
    const amount = document.getElementById('egreso-monto').value;
    const reason = document.getElementById('egreso-motivo').value;
    
    const result = await fetchAPI('cashflow', 'POST', {
        amount: amount,
        reason: reason,
        user: currentUser ? currentUser.username : 'Sistema'
    });
    
    if (result) {
        showToast('Egreso registrado', 'success');
        document.getElementById('egreso-form').reset();
        openCierreModal(); // Refresh modal data
        loadDashboardData(); // Refresh main dashboard if admin
    }
}

function confirmCierreCaja() {
    logAction('Cierre de Caja', `Turno cerrado con un saldo neto en caja de $${currentCashflowNet.toFixed(2)}`);
    showToast('Caja cerrada exitosamente', 'success');
    document.getElementById('cierre-modal').classList.remove('show');
    logout();
}

// Utils
function renderTable(tableId, data, rowTemplate, viewId = null) {
    // If a viewId is passed, only find the table inside that view to avoid ID conflicts
    const tbody = viewId 
        ? document.querySelector(`#${viewId} #${tableId} tbody`) || document.querySelector(`#${tableId}`) 
        : document.querySelector(`#${tableId} tbody`) || document.querySelector(`#${tableId}`);
        
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">Todo en orden</td></tr>`;
        return;
    }
    data.forEach(item => {
        tbody.innerHTML += rowTemplate(item);
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'checkmark-circle' : 'alert-circle';
    toast.innerHTML = `<ion-icon name="${icon}"></ion-icon> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
