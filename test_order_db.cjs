const Database = require('better-sqlite3');
const sqlite = new Database('sqlite.db');

const orders = sqlite.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all();
console.log(orders);

if (orders.length > 0) {
  for (let order of orders) {
    const items = sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    console.log(`Items for order ${order.id}:`);
    console.log(items);
  }
}
