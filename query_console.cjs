const db = require('better-sqlite3')('c:/Users/karwa/Downloads/Pepsi/Invoice-Dispatcher/.local/state/replit/log-query.db');
const rows = db.prepare("SELECT * FROM browser_console_logs WHERE message LIKE '%Pepsi%' LIMIT 100").all();
console.log(JSON.stringify(rows.map(r => r.message), null, 2));
db.close();
