const db = require('better-sqlite3')('./sqlite.db');
const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
