export async function onRequestGet(context) {
    const logs = JSON.parse(await context.env.POS_KV.get('AUDIT_LOG_DATA') || '[]');
    // Return logs sorted by date descending (newest first)
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
    const data = await context.request.json();
    const logs = JSON.parse(await context.env.POS_KV.get('AUDIT_LOG_DATA') || '[]');
    
    const newLog = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        action: data.action,
        user: data.user || 'Sistema',
        reason: data.reason || 'N/A'
    };
    logs.push(newLog);
    
    await context.env.POS_KV.put('AUDIT_LOG_DATA', JSON.stringify(logs));
    return new Response(JSON.stringify({ success: true, log: newLog }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}
