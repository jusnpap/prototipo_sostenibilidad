export async function onRequestGet(context) {
    const products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
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
