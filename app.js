// Global State
let inventory = [];
let cart = [];

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

    // Load initial data
    loadDashboardData();
    
    // Modals
    document.getElementById('btn-add-product').addEventListener('click', () => openProductModal());
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeProductModal);
    });

    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);

    // POS
    document.getElementById('pos-search').addEventListener('input', (e) => filterPosProducts(e.target.value));
    document.getElementById('inv-search').addEventListener('input', (e) => filterInventory(e.target.value));
    document.getElementById('btn-clear-cart').addEventListener('click', clearCart);
    document.getElementById('btn-checkout').addEventListener('click', processSale);
    
    document.getElementById('close-payment-modal').addEventListener('click', () => {
        document.getElementById('payment-modal').classList.remove('show');
    });
});

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
        'inventory': 'Gestión de Inventario'
    };
    viewTitle.innerText = titleMap[viewId];

    if(viewId === 'inventory' || viewId === 'pos') {
        loadInventory();
    } else if (viewId === 'dashboard') {
        loadDashboardData();
    }
}

// API Calls
async function fetchAPI(endpoint, method = 'GET', body = null) {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`/api/${endpoint}`, options);
        if (!res.ok) throw new Error('API Error');
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
    }
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
    const data = {
        name: document.getElementById('prod-name').value,
        cost_price: parseFloat(document.getElementById('prod-cost').value),
        sale_price: parseFloat(document.getElementById('prod-price').value),
        stock: parseInt(document.getElementById('prod-stock').value),
        min_stock: parseInt(document.getElementById('prod-min-stock').value),
        expiry_date: document.getElementById('prod-expiry').value
    };

    let result;
    if (id) {
        result = await fetchAPI(`products/${id}`, 'PUT', data);
    } else {
        result = await fetchAPI('products', 'POST', data);
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
    if(confirm('¿Seguro que quieres eliminar este producto?')) {
        const result = await fetchAPI(`products/${id}`, 'DELETE');
        if(result) {
            showToast('Producto eliminado', 'success');
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
        clearCart();
        loadInventory(); // Refresh stock
        loadDashboardData(); // Refresh metrics
    }
}

// Utils
function renderTable(tableId, data, rowTemplate) {
    const tbody = document.querySelector(`#${tableId} tbody`);
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
