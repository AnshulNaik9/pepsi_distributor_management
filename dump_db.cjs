const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
  console.log('--- TABLE: ' + table.name + ' ---');
  const rows = db.prepare('SELECT * FROM ' + table.name).all();
  console.log(JSON.stringify(rows, null, 2));
}

db.close();
