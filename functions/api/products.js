export async function onRequestGet(context) {
    let products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
    
    // Seed database if empty
    if (products.length === 0) {
        const seedData = [
            { id: "1001", name: "Laptop Dell XPS 15", cost_price: 1000, sale_price: 1500, stock: 10, min_stock: 2, expiry_date: "" },
            { id: "1002", name: "Monitor LG 27 pulgadas", cost_price: 200, sale_price: 300, stock: 15, min_stock: 5, expiry_date: "" },
            { id: "1003", name: "Ratón Inalámbrico Logitech", cost_price: 15, sale_price: 30, stock: 50, min_stock: 10, expiry_date: "" },
            { id: "1004", name: "Teclado Mecánico RGB", cost_price: 40, sale_price: 80, stock: 20, min_stock: 5, expiry_date: "" },
            { id: "2001", name: "Coca Cola 3L", cost_price: 2, sale_price: 3.5, stock: 100, min_stock: 20, expiry_date: "2026-12-31" },
            { id: "2002", name: "Papas Fritas Lays", cost_price: 1, sale_price: 2, stock: 80, min_stock: 15, expiry_date: "2026-10-15" },
            { id: "2003", name: "Galletas Oreo Clásicas", cost_price: 0.8, sale_price: 1.5, stock: 120, min_stock: 30, expiry_date: "2026-11-20" },
            { id: "3001", name: "Cuaderno Universitario 100 Hojas", cost_price: 1.5, sale_price: 3, stock: 200, min_stock: 50, expiry_date: "" },
            { id: "3002", name: "Bolígrafo Bic Azul", cost_price: 0.2, sale_price: 0.5, stock: 500, min_stock: 100, expiry_date: "" },
            { id: "3003", name: "Resma de Papel A4 500 hojas", cost_price: 3, sale_price: 5, stock: 40, min_stock: 10, expiry_date: "" }
        ];
        products = seedData;
        await context.env.POS_KV.put('PRODUCTS_DATA', JSON.stringify(products));
        
        const logs = JSON.parse(await context.env.POS_KV.get('AUDIT_LOG_DATA') || '[]');
        logs.push({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            action: `Semilla de base de datos`,
            user: 'Sistema',
            reason: 'Se agregaron 10 productos de prueba automáticamente'
        });
        await context.env.POS_KV.put('AUDIT_LOG_DATA', JSON.stringify(logs));
    }
    
    return new Response(JSON.stringify(products), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
    const data = await context.request.json();
    const products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
    
    data.id = Date.now().toString();
    products.push(data);
    
    await context.env.POS_KV.put('PRODUCTS_DATA', JSON.stringify(products));
    return new Response(JSON.stringify({ id: data.id, message: 'Producto agregado' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}
