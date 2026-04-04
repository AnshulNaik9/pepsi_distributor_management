const db = require('better-sqlite3')('c:/Users/karwa/Downloads/Pepsi/Invoice-Dispatcher/.local/state/replit/log-query.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
if (tables.some(t => t.name === 'logs')) {
  const rows = db.prepare('SELECT * FROM logs LIMIT 100').all();
  console.log(JSON.stringify(rows, null, 2));
}
db.close();
