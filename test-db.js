import Database from 'better-sqlite3';
try {
  const db = new Database('sqlite.db', { fileMustExist: true });
  const products = db.prepare('SELECT * FROM products').all();
  console.log('Products:', products);
} catch (err) {
  console.error('SQLite Error:', err.message);
}
