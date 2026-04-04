const db = require('better-sqlite3')('c:/Users/karwa/Downloads/Pepsi/Invoice-Dispatcher/.local/state/replit/log-query.db');
const rows = db.prepare("SELECT * FROM network_requests WHERE url LIKE '%/api/products%' AND method = 'POST' LIMIT 100").all();
console.log(JSON.stringify(rows.map(r => ({url: r.url, method: r.method, body: r.post_data})), null, 2));
db.close();
