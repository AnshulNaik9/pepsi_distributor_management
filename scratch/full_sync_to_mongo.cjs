/**
 * Full Sync: SQLite (Web App) → MongoDB Backend
 * Reads directly from sqlite.db and upserts all records into MongoDB.
 * Safe to re-run — it won't create duplicates.
 */

const Database = require('better-sqlite3');
const { MongoClient } = require('mongodb');
const path = require('path');

const SQLITE_DB_PATH = path.join(process.cwd(), 'sqlite.db');
const MONGODB_URI = 'mongodb://naikanshu9_db_user:Karwar%40123@ac-izwzb8r-shard-00-00.4axkjzl.mongodb.net:27017,ac-izwzb8r-shard-00-01.4axkjzl.mongodb.net:27017,ac-izwzb8r-shard-00-02.4axkjzl.mongodb.net:27017/distrisys?ssl=true&authSource=admin&retryWrites=true&w=majority';

function parseDate(val) {
  if (!val) return new Date();
  const n = Number(val);
  if (isNaN(n)) return new Date(val);
  // SQLite drizzle timestamps are in seconds if < year 2001 threshold
  return n < 10000000000 ? new Date(n * 1000) : new Date(n);
}

async function upsert(col, filter, doc) {
  await col.replaceOne(filter, doc, { upsert: true });
}

async function sync() {
  const db = new Database(SQLITE_DB_PATH);
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const mg = client.db();

    // ID maps: SQLite int → MongoDB ObjectId
    const routeMap = {};
    const productMap = {};
    const truckMap = {};
    const customerMap = {};

    // ── 1. ROUTES ─────────────────────────────────────────────────────────────
    const sqlRoutes = db.prepare('SELECT * FROM routes').all();
    console.log(`\n📍 Syncing ${sqlRoutes.length} Routes...`);
    for (const r of sqlRoutes) {
      const col = mg.collection('routes');
      const existing = await col.findOne({ _sqliteId: r.id });
      if (existing) {
        await col.updateOne({ _sqliteId: r.id }, { $set: { name: r.name, updatedAt: new Date() } });
        routeMap[r.id] = existing._id;
      } else {
        const res = await col.insertOne({ _sqliteId: r.id, name: r.name, createdAt: new Date(), updatedAt: new Date() });
        routeMap[r.id] = res.insertedId;
      }
    }
    // Rebuild routeMap for routes that already existed
    const allMongoRoutes = await mg.collection('routes').find({ _sqliteId: { $exists: true } }).toArray();
    for (const r of allMongoRoutes) routeMap[r._sqliteId] = r._id;
    console.log(`   ✔ ${sqlRoutes.length} routes synced`);

    // Fallback route for orphaned customers
    let fallbackRouteId;
    let fallback = await mg.collection('routes').findOne({ name: 'Unassigned' });
    if (!fallback) {
      const res = await mg.collection('routes').insertOne({ name: 'Unassigned', createdAt: new Date(), updatedAt: new Date() });
      fallbackRouteId = res.insertedId;
    } else {
      fallbackRouteId = fallback._id;
    }

    // ── 2. PRODUCTS ───────────────────────────────────────────────────────────
    const sqlProducts = db.prepare('SELECT * FROM products').all();
    console.log(`\n🧴 Syncing ${sqlProducts.length} Products...`);
    for (const p of sqlProducts) {
      const col = mg.collection('products');
      const doc = {
        _sqliteId: p.id,
        name: p.name,
        imageUrl: p.image_url,
        price: p.price,
        unit: p.unit || 'ltr',
        quantityPerUnit: p.quantity_per_unit || '1',
        itemsPerCase: p.items_per_case || 1,
        category: p.category || 'others',
        purchasePrice: p.purchase_price || 0,
        updatedAt: new Date(),
      };
      const existing = await col.findOne({ _sqliteId: p.id });
      if (existing) {
        await col.updateOne({ _sqliteId: p.id }, { $set: doc });
        productMap[p.id] = existing._id;
      } else {
        const res = await col.insertOne({ ...doc, createdAt: new Date() });
        productMap[p.id] = res.insertedId;
      }
    }
    const allMongoProducts = await mg.collection('products').find({ _sqliteId: { $exists: true } }).toArray();
    for (const p of allMongoProducts) productMap[p._sqliteId] = p._id;
    console.log(`   ✔ ${sqlProducts.length} products synced`);

    // ── 3. TRUCKS ─────────────────────────────────────────────────────────────
    const sqlTrucks = db.prepare('SELECT * FROM trucks').all();
    console.log(`\n🚚 Syncing ${sqlTrucks.length} Trucks...`);
    for (const t of sqlTrucks) {
      const col = mg.collection('trucks');
      const doc = {
        _sqliteId: t.id,
        vehicleNumber: t.vehicle_number,
        driverName: t.driver_name,
        updatedAt: new Date(),
      };
      const existing = await col.findOne({ _sqliteId: t.id });
      if (existing) {
        await col.updateOne({ _sqliteId: t.id }, { $set: doc });
        truckMap[t.id] = existing._id;
      } else {
        const res = await col.insertOne({ ...doc, createdAt: new Date() });
        truckMap[t.id] = res.insertedId;
      }
    }
    const allMongoTrucks = await mg.collection('trucks').find({ _sqliteId: { $exists: true } }).toArray();
    for (const t of allMongoTrucks) truckMap[t._sqliteId] = t._id;
    console.log(`   ✔ ${sqlTrucks.length} trucks synced`);

    // ── 4. CUSTOMERS ─────────────────────────────────────────────────────────
    const sqlCustomers = db.prepare('SELECT * FROM customers').all();
    console.log(`\n👥 Syncing ${sqlCustomers.length} Customers...`);
    let custNew = 0, custUpdated = 0;
    for (const c of sqlCustomers) {
      const col = mg.collection('customers');
      const doc = {
        _sqliteId: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        routeId: routeMap[c.route_id] || fallbackRouteId,
        isDeleted: !!c.is_deleted,
        hasSpecialDiscount: !!c.has_special_discount,
        creditBalance: c.credit_balance,
        updatedAt: new Date(),
      };
      const existing = await col.findOne({ _sqliteId: c.id });
      if (existing) {
        await col.updateOne({ _sqliteId: c.id }, { $set: doc });
        customerMap[c.id] = existing._id;
        custUpdated++;
      } else {
        const res = await col.insertOne({ ...doc, createdAt: new Date() });
        customerMap[c.id] = res.insertedId;
        custNew++;
      }
    }
    const allMongoCustomers = await mg.collection('customers').find({ _sqliteId: { $exists: true } }).toArray();
    for (const c of allMongoCustomers) customerMap[c._sqliteId] = c._id;
    console.log(`   ✔ ${custNew} new, ${custUpdated} updated customers`);

    // ── 5. OFFERS ─────────────────────────────────────────────────────────────
    const sqlOffers = db.prepare('SELECT * FROM offers').all();
    console.log(`\n🎁 Syncing ${sqlOffers.length} Offers...`);
    for (const o of sqlOffers) {
      if (!productMap[o.buy_product_id] || !productMap[o.free_product_id]) continue;
      const doc = {
        _sqliteId: o.id,
        name: o.name,
        buyProductId: productMap[o.buy_product_id],
        buyQuantity: o.buy_quantity,
        freeProductId: productMap[o.free_product_id],
        freeQuantity: o.free_quantity,
        isActive: !!o.is_active,
        updatedAt: new Date(),
      };
      const existing = await mg.collection('offers').findOne({ _sqliteId: o.id });
      if (existing) {
        await mg.collection('offers').updateOne({ _sqliteId: o.id }, { $set: doc });
      } else {
        await mg.collection('offers').insertOne({ ...doc, createdAt: new Date() });
      }
    }
    console.log(`   ✔ ${sqlOffers.length} offers synced`);

    // ── 6. GODOWN STOCK ───────────────────────────────────────────────────────
    const sqlGodown = db.prepare('SELECT * FROM godown_stock').all();
    console.log(`\n🏭 Syncing ${sqlGodown.length} Godown Stock entries...`);
    for (const s of sqlGodown) {
      const pId = productMap[s.product_id];
      if (!pId) continue;
      await mg.collection('godownstocks').replaceOne(
        { _sqliteId: s.id },
        { _sqliteId: s.id, productId: pId, casesAvailable: s.cases_available, updatedAt: new Date() },
        { upsert: true }
      );
    }
    console.log(`   ✔ ${sqlGodown.length} godown stock entries synced`);

    // ── 7. TRUCK STOCK ────────────────────────────────────────────────────────
    const sqlTruckStock = db.prepare('SELECT * FROM truck_stock').all();
    console.log(`\n🚛 Syncing ${sqlTruckStock.length} Truck Stock entries...`);
    for (const s of sqlTruckStock) {
      const tId = truckMap[s.truck_id];
      const pId = productMap[s.product_id];
      if (!tId || !pId) continue;
      await mg.collection('truckstocks').replaceOne(
        { _sqliteId: s.id },
        { _sqliteId: s.id, truckId: tId, productId: pId, casesAvailable: s.cases_available, updatedAt: new Date() },
        { upsert: true }
      );
    }
    console.log(`   ✔ ${sqlTruckStock.length} truck stock entries synced`);

    // ── 8. ORDERS (full replace) ──────────────────────────────────────────────
    const sqlOrders = db.prepare('SELECT * FROM orders').all();
    console.log(`\n🧾 Syncing ${sqlOrders.length} Orders...`);
    let ordNew = 0, ordUpdated = 0;
    for (const o of sqlOrders) {
      const cId = customerMap[o.customer_id];
      const tId = truckMap[o.truck_id];
      if (!cId || !tId) continue;

      const sqlItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
      const items = sqlItems.map(item => ({
        productId: productMap[item.product_id],
        quantity: item.quantity,
        isFree: !!item.is_free,
        customPrice: item.custom_price || null,
      })).filter(i => i.productId);

      const doc = {
        _sqliteId: o.id,
        customerId: cId,
        truckId: tId,
        date: parseDate(o.date),
        totalAmount: o.total_amount,
        paymentMode: o.payment_mode,
        isArchived: !!o.is_archived,
        items,
        updatedAt: new Date(),
      };

      const existing = await mg.collection('orders').findOne({ _sqliteId: o.id });
      if (existing) {
        await mg.collection('orders').replaceOne({ _sqliteId: o.id }, { ...doc, createdAt: existing.createdAt });
        ordUpdated++;
      } else {
        await mg.collection('orders').insertOne({ ...doc, createdAt: parseDate(o.date) });
        ordNew++;
      }
    }
    console.log(`   ✔ ${ordNew} new, ${ordUpdated} updated orders`);

    // ── 9. EXPENSES ───────────────────────────────────────────────────────────
    const sqlExpenses = db.prepare('SELECT * FROM expenses').all();
    console.log(`\n💸 Syncing ${sqlExpenses.length} Expenses...`);
    for (const e of sqlExpenses) {
      const tId = truckMap[e.truck_id];
      if (!tId) continue;
      const doc = {
        _sqliteId: e.id,
        truckId: tId,
        date: parseDate(e.date),
        description: e.description,
        amount: e.amount,
        updatedAt: new Date(),
      };
      const existing = await mg.collection('expenses').findOne({ _sqliteId: e.id });
      if (existing) {
        await mg.collection('expenses').updateOne({ _sqliteId: e.id }, { $set: doc });
      } else {
        await mg.collection('expenses').insertOne({ ...doc, createdAt: new Date() });
      }
    }
    console.log(`   ✔ ${sqlExpenses.length} expenses synced`);

    // ── 10. AUDIT LOG ─────────────────────────────────────────────────────────
    const sqlAudit = db.prepare('SELECT * FROM audit_log').all();
    console.log(`\n📋 Syncing ${sqlAudit.length} Audit Log entries...`);
    for (const a of sqlAudit) {
      const existing = await mg.collection('auditlogs').findOne({ _sqliteId: a.id });
      if (!existing) {
        await mg.collection('auditlogs').insertOne({
          _sqliteId: a.id,
          action: a.action,
          entityType: a.entity_type,
          entityId: String(a.entity_id),
          entityName: a.entity_name,
          details: a.details,
          timestamp: parseDate(a.timestamp),
          createdAt: new Date(),
        });
      }
    }
    console.log(`   ✔ ${sqlAudit.length} audit log entries synced`);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════');
    console.log('✅ SYNC COMPLETE — MongoDB is up to date');
    console.log('══════════════════════════════════════');

    const summary = [
      ['Routes',        await mg.collection('routes').countDocuments()],
      ['Products',      await mg.collection('products').countDocuments()],
      ['Trucks',        await mg.collection('trucks').countDocuments()],
      ['Customers',     await mg.collection('customers').countDocuments()],
      ['Offers',        await mg.collection('offers').countDocuments()],
      ['Godown Stock',  await mg.collection('godownstocks').countDocuments()],
      ['Truck Stock',   await mg.collection('truckstocks').countDocuments()],
      ['Orders',        await mg.collection('orders').countDocuments()],
      ['Expenses',      await mg.collection('expenses').countDocuments()],
      ['Audit Logs',    await mg.collection('auditlogs').countDocuments()],
    ];
    console.log('\nCollection'.padEnd(18) + 'Count');
    console.log('─'.repeat(24));
    for (const [name, count] of summary) {
      console.log(name.padEnd(18) + count);
    }

  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    console.error(err.stack);
  } finally {
    await client.close();
    db.close();
  }
}

sync();
