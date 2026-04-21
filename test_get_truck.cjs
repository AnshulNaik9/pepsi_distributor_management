const Database = require('better-sqlite3');
const sqlite = new Database('sqlite.db');

const truckStock = sqlite.prepare('SELECT * FROM truck_stock WHERE product_id = 22').all();
console.log(truckStock);
