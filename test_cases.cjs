const Database = require('better-sqlite3');
const sqlite = new Database('sqlite.db');

const truckStock = sqlite.prepare('SELECT id, product_id, truck_id, cases_available FROM truck_stock WHERE product_id = 22').all();
console.log(truckStock);
