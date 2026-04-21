const sqlite = require('better-sqlite3');
const db = new sqlite('sqlite.db');
const res = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_items'").get();
console.log(res);
