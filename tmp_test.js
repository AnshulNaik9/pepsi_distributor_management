import Database from 'better-sqlite3';

const dbPath = 'sqlite.db'; // or whatever the path is
const db = new Database(dbPath);

const godownStock = db.prepare('SELECT * FROM godown_stock').all();
console.log(godownStock.map(r => ({ id: r.id, product_id: r.product_id, cases_available: r.cases_available, typeOfCases: typeof r.cases_available })));
