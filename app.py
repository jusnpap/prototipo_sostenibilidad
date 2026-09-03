from flask import Flask, request, jsonify, send_from_directory
import database
from datetime import datetime
import os

app = Flask(__name__, static_folder='static')

# Initialize database if it doesn't exist
if not os.path.exists(database.DB_FILE):
    database.init_db()

@app.route('/')
def index():
    return app.send_static_file('index.html')

# --- Product API ---
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = database.get_db_connection()
    products = conn.execute('SELECT * FROM products').fetchall()
    conn.close()
    return jsonify([dict(p) for p in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    conn = database.get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO products (name, cost_price, sale_price, stock, min_stock, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['name'], data['cost_price'], data['sale_price'], data['stock'], data.get('min_stock', 5), data.get('expiry_date')))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'message': 'Product added successfully'}), 201

@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    data = request.json
    conn = database.get_db_connection()
    conn.execute('''
        UPDATE products 
        SET name = ?, cost_price = ?, sale_price = ?, stock = ?, min_stock = ?, expiry_date = ?
        WHERE id = ?
    ''', (data['name'], data['cost_price'], data['sale_price'], data['stock'], data['min_stock'], data.get('expiry_date'), id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    conn = database.get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product deleted successfully'})

# --- Sales API ---
@app.route('/api/sales', methods=['POST'])
def create_sale():
    data = request.json
    items = data.get('items', [])
    payment_method = data.get('payment_method', 'Efectivo')
    if not items:
        return jsonify({'error': 'No items provided'}), 400
    
    total_amount = sum(item['price'] * item['quantity'] for item in items)
    created_at = datetime.now().isoformat()
    
    conn = database.get_db_connection()
    c = conn.cursor()
    try:
        # 1. Create sale record
        c.execute('INSERT INTO sales (total_amount, created_at) VALUES (?, ?)', (total_amount, created_at))
        sale_id = c.lastrowid
        
        # 2. Add sale items and update stock
        for item in items:
            c.execute('''
                INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            ''', (sale_id, item['product_id'], item['quantity'], item['price'], item['price'] * item['quantity']))
            
            c.execute('UPDATE products SET stock = stock - ? WHERE id = ?', (item['quantity'], item['product_id']))
        
        # 3. Add to cash flow
        c.execute('''
            INSERT INTO cash_flow (transaction_type, amount, reason, created_at)
            VALUES (?, ?, ?, ?)
        ''', ('IN', total_amount, f'Venta #{sale_id} ({payment_method})', created_at))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
        
    return jsonify({'message': 'Sale completed successfully', 'sale_id': sale_id}), 201

# --- Dashboard & Reports API ---
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    conn = database.get_db_connection()
    
    # 1. Low stock alerts
    low_stock = conn.execute('SELECT * FROM products WHERE stock <= min_stock').fetchall()
    
    # 2. Expiring soon (products expiring within 30 days or already expired)
    today = datetime.now().strftime('%Y-%m-%d')
    expiring_soon = conn.execute('SELECT * FROM products WHERE expiry_date IS NOT NULL AND expiry_date != "" AND expiry_date <= date("now", "+30 days")').fetchall()
    
    # 3. Today's sales
    today_start = today + "T00:00:00"
    todays_sales = conn.execute('SELECT SUM(total_amount) as total FROM sales WHERE created_at >= ?', (today_start,)).fetchone()
    
    # 4. Cash Flow (today)
    cash_in = conn.execute("SELECT SUM(amount) as total FROM cash_flow WHERE transaction_type = 'IN' AND created_at >= ?", (today_start,)).fetchone()
    cash_out = conn.execute("SELECT SUM(amount) as total FROM cash_flow WHERE transaction_type = 'OUT' AND created_at >= ?", (today_start,)).fetchone()
    
    in_val = cash_in['total'] or 0
    out_val = cash_out['total'] or 0
    
    conn.close()
    
    return jsonify({
        'low_stock_alerts': [dict(p) for p in low_stock],
        'expiring_soon_alerts': [dict(p) for p in expiring_soon],
        'todays_sales': todays_sales['total'] or 0,
        'cash_balance': in_val - out_val
    })

if __name__ == '__main__':
    # When running locally on windows, we can run this directly
    print("Iniciando el servidor POS en http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
