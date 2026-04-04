const db = require('better-sqlite3')('c:/Users/karwa/Downloads/Pepsi/Invoice-Dispatcher/.local/state/scribe/scribe.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
db.close();
