const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
const pCount = db.prepare('SELECT count(*) as count FROM products').get().count;
const cCount = db.prepare('SELECT count(*) as count FROM customers').get().count;
const oCount = db.prepare('SELECT count(*) as count FROM orders').get().count;
console.log('Products:', pCount);
console.log('Customers:', cCount);
console.log('Orders:', oCount);
db.close();
