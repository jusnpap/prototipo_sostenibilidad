export async function onRequestGet(context) {
    try {
        const cashFlow = JSON.parse(await context.env.POS_KV.get('CASH_FLOW_DATA') || '[]');
        
        // Filter only today's transactions
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysTransactions = cashFlow.filter(c => c.created_at.startsWith(todayStr));
        
        // Sort newest first
        todaysTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return new Response(JSON.stringify(todaysTransactions), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPost(context) {
    try {
        const data = await context.request.json();
        const cashFlow = JSON.parse(await context.env.POS_KV.get('CASH_FLOW_DATA') || '[]');
        
        const newTransaction = {
            id: Date.now().toString(),
            transaction_type: 'OUT',
            amount: parseFloat(data.amount),
            reason: data.reason || 'Egreso',
            created_at: new Date().toISOString()
        };
        
        cashFlow.push(newTransaction);
        
        // Audit log for the egreso
        const logs = JSON.parse(await context.env.POS_KV.get('AUDIT_LOG_DATA') || '[]');
        logs.push({
            id: Date.now().toString(),
            date: newTransaction.created_at,
            action: `Egreso registrado por $${newTransaction.amount.toFixed(2)}`,
            user: data.user || 'Sistema',
            reason: newTransaction.reason
        });

        await Promise.all([
            context.env.POS_KV.put('CASH_FLOW_DATA', JSON.stringify(cashFlow)),
            context.env.POS_KV.put('AUDIT_LOG_DATA', JSON.stringify(logs))
        ]);

        return new Response(JSON.stringify({ message: 'Egreso registrado exitosamente' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
