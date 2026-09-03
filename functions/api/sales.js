export async function onRequestPost(context) {
    const data = await context.request.json();
    const items = data.items || [];
    const paymentMethod = data.payment_method || 'Efectivo';
    
    if (items.length === 0) {
        return new Response(JSON.stringify({ error: 'No items' }), { status: 400 });
    }

    let products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
    let sales = JSON.parse(await context.env.POS_KV.get('SALES_DATA') || '[]');
    let cashFlow = JSON.parse(await context.env.POS_KV.get('CASH_FLOW_DATA') || '[]');

    // Deduct stock
    items.forEach(item => {
        const product = products.find(p => p.id == item.product_id);
        if(product) product.stock -= item.quantity;
    });

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const saleId = Date.now().toString();
    const createdAt = new Date().toISOString();

    sales.push({ id: saleId, total_amount: totalAmount, created_at: createdAt, items });
    cashFlow.push({
        id: Date.now().toString(),
        transaction_type: 'IN',
        amount: totalAmount,
        reason: `Venta #${saleId} (${paymentMethod})`,
        created_at: createdAt
    });

    // Save all to KV
    await Promise.all([
        context.env.POS_KV.put('PRODUCTS_DATA', JSON.stringify(products)),
        context.env.POS_KV.put('SALES_DATA', JSON.stringify(sales)),
        context.env.POS_KV.put('CASH_FLOW_DATA', JSON.stringify(cashFlow))
    ]);

    return new Response(JSON.stringify({ message: 'Venta procesada', sale_id: saleId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}
