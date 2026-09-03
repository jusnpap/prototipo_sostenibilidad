export async function onRequestPut(context) {
    const id = context.params.id;
    const data = await context.request.json();
    const products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
    
    const index = products.findIndex(p => p.id == id);
    if(index > -1) {
        products[index] = { ...products[index], ...data };
        await context.env.POS_KV.put('PRODUCTS_DATA', JSON.stringify(products));
        return new Response(JSON.stringify({ message: 'Producto actualizado' }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Not found', { status: 404 });
}

export async function onRequestDelete(context) {
    const id = context.params.id;
    let products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
    products = products.filter(p => p.id != id);
    
    await context.env.POS_KV.put('PRODUCTS_DATA', JSON.stringify(products));
    return new Response(JSON.stringify({ message: 'Producto eliminado' }), { headers: { 'Content-Type': 'application/json' } });
}
