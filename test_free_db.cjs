const Database = require('better-sqlite3');
const sqlite = new Database('sqlite.db');

const freeItems = sqlite.prepare('SELECT * FROM order_items WHERE is_free = 1 ORDER BY id DESC LIMIT 5').all();
console.log(freeItems);
