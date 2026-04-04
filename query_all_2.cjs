const db = require('better-sqlite3')('./sqlite.db');
const products = db.prepare('SELECT * FROM products').all();
const godown_stock = db.prepare('SELECT * FROM godown_stock').all();
const truck_stock = db.prepare('SELECT * FROM truck_stock').all();
const order_items = db.prepare('SELECT * FROM order_items LIMIT 100').all();
console.log(JSON.stringify({products, godown_stock, truck_stock, order_items}, null, 2));
db.close();
