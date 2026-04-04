const db = require('better-sqlite3')('c:/Users/karwa/Downloads/Pepsi/Invoice-Dispatcher/.local/state/scribe/scribe.db');
const rows = db.prepare('SELECT * FROM documents LIMIT 50').all();
console.log(JSON.stringify(rows.map(r => ({id: r.id, path: r.path})), null, 2));
db.close();
