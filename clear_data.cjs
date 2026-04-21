const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

console.log("Starting data wipe...");

try {
  db.exec("BEGIN TRANSACTION");

  // Wipe transaction tables
  db.prepare("DELETE FROM orders").run();
  db.prepare("DELETE FROM order_items").run();
  db.prepare("DELETE FROM expenses").run();
  db.prepare("DELETE FROM monthly_snapshots").run();
  db.prepare("DELETE FROM audit_log").run();
  
  // Wipe truck stock (drivers should load fresh from godown next time)
  db.prepare("DELETE FROM truck_stock").run();

  // Reset customer credit balances to 0
  db.prepare("UPDATE customers SET credit_balance = 0").run();

  db.exec("COMMIT");
  console.log("Successfully wiped all transactional data. Dashboard should now be 0.");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Error wiping data:", err);
}

db.close();
