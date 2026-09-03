export async function onRequestGet(context) {
    try {
        if (!context.env.POS_KV) {
            throw new Error("KV binding 'POS_KV' is undefined. Please check Cloudflare Settings -> Bindings and redeploy.");
        }

        const products = JSON.parse(await context.env.POS_KV.get('PRODUCTS_DATA') || '[]');
        const sales = JSON.parse(await context.env.POS_KV.get('SALES_DATA') || '[]');
        const cashFlow = JSON.parse(await context.env.POS_KV.get('CASH_FLOW_DATA') || '[]');

        const lowStockAlerts = products.filter(p => p.stock <= p.min_stock);
        
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const expiringSoonAlerts = products.filter(p => {
            if (!p.expiry_date) return false;
            return new Date(p.expiry_date) <= thirtyDays;
        });

        const todayStr = new Date().toISOString().split('T')[0];
        
        const todaysSales = sales.filter(s => s.created_at.startsWith(todayStr))
                                 .reduce((sum, s) => sum + s.total_amount, 0);

        const todaysCashIn = cashFlow.filter(c => c.transaction_type === 'IN' && c.created_at.startsWith(todayStr))
                                     .reduce((sum, c) => sum + c.amount, 0);
        const todaysCashOut = cashFlow.filter(c => c.transaction_type === 'OUT' && c.created_at.startsWith(todayStr))
                                      .reduce((sum, c) => sum + c.amount, 0);
                                      
        const cashBalance = todaysCashIn - todaysCashOut;

        const data = {
            low_stock_alerts: lowStockAlerts,
            expiring_soon_alerts: expiringSoonAlerts,
            todays_sales: todaysSales,
            cash_balance: cashBalance
        };

        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
