const Database = require('better-sqlite3');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = path.join(process.cwd(), 'sqlite.db');
const MONGODB_URI = 'mongodb://127.0.0.1:27017/distrisys';

async function migrate() {
  const db = new Database(SQLITE_DB_PATH);
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const mongoDb = client.db();    // Clear transactional data for a fresh sync
    console.log('Clearing existing transactional data in MongoDB...');
    await mongoDb.collection('orders').deleteMany({});
    await mongoDb.collection('expenses').deleteMany({});
    await mongoDb.collection('auditlogs').deleteMany({});
    // Stocks are upserted, so no need to clear unless we want to remove dead stock records

    const parseDate = (val) => {
      if (!val) return new Date();
      // SQLite dates from Drizzle can be numbers (seconds or ms) or strings
      const n = Number(val);
      if (isNaN(n)) return new Date(val);
      // If result is before 2000, it's likely seconds
      return n < 10000000000 ? new Date(n * 1000) : new Date(n);
    };

    // Mappings to track SQLite ID -> MongoDB ObjectId
    const routeMap = {};
    const productMap = {};
    const truckMap = {};
    const customerMap = {};
    const orderMap = {};

    // 1. Routes
    console.log('Syncing Routes...');
    const sqliteRoutes = db.prepare('SELECT * FROM routes').all();
    for (const r of sqliteRoutes) {
      let mongoRoute = await mongoDb.collection('routes').findOne({ name: r.name });
      if (!mongoRoute) {
        const result = await mongoDb.collection('routes').insertOne({ 
          name: r.name, 
          createdAt: new Date(), 
          updatedAt: new Date() 
        });
        routeMap[r.id] = result.insertedId;
      } else {
        routeMap[r.id] = mongoRoute._id;
      }
    }

    // Fallback route for orphaned customers
    let fallbackRouteId;
    const fallbackRouteName = 'Imported / Unassigned';
    let mongoFallbackRoute = await mongoDb.collection('routes').findOne({ name: fallbackRouteName });
    if (!mongoFallbackRoute) {
      const result = await mongoDb.collection('routes').insertOne({ 
        name: fallbackRouteName, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
      fallbackRouteId = result.insertedId;
    } else {
      fallbackRouteId = mongoFallbackRoute._id;
    }

    // 2. Products
    console.log('Syncing Products...');
    const sqliteProducts = db.prepare('SELECT * FROM products').all();
    for (const p of sqliteProducts) {
      const mappedData = {
        name: p.name,
        imageUrl: p.image_url,
        price: p.price,
        unit: p.unit,
        quantityPerUnit: p.quantity_per_unit,
        itemsPerCase: p.items_per_case,
        category: p.category,
        purchasePrice: p.purchase_price,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let mongoProd = await mongoDb.collection('products').findOne({ name: p.name });
      if (!mongoProd) {
        const result = await mongoDb.collection('products').insertOne(mappedData);
        productMap[p.id] = result.insertedId;
      } else {
        productMap[p.id] = mongoProd._id;
      }
    }

    // 3. Trucks
    console.log('Syncing Trucks...');
    const sqliteTrucks = db.prepare('SELECT * FROM trucks').all();
    for (const t of sqliteTrucks) {
      const mappedData = {
        vehicleNumber: t.vehicle_number,
        driverName: t.driver_name,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let mongoTruck = await mongoDb.collection('trucks').findOne({ vehicleNumber: t.vehicle_number });
      if (!mongoTruck) {
        const result = await mongoDb.collection('trucks').insertOne(mappedData);
        truckMap[t.id] = result.insertedId;
      } else {
        truckMap[t.id] = mongoTruck._id;
      }
    }

    // 4. Customers
    console.log('Syncing Customers...');
    const sqliteCustomers = db.prepare('SELECT * FROM customers').all();
    let importedCustomers = 0;
    for (const c of sqliteCustomers) {
      const mappedData = {
        name: c.name,
        phone: c.phone,
        address: c.address,
        routeId: routeMap[c.route_id] || fallbackRouteId,
        isDeleted: !!c.is_deleted,
        hasSpecialDiscount: !!c.has_special_discount,
        creditBalance: c.credit_balance,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let mongoCustomer = await mongoDb.collection('customers').findOne({ name: c.name, phone: c.phone });
      if (!mongoCustomer) {
        const result = await mongoDb.collection('customers').insertOne(mappedData);
        customerMap[c.id] = result.insertedId;
        importedCustomers++;
      } else {
        customerMap[c.id] = mongoCustomer._id;
      }
    }
    console.log(`Synced ${importedCustomers} new customers.`);

    // 5. Offers
    console.log('Syncing Offers...');
    const sqliteOffers = db.prepare('SELECT * FROM offers').all();
    for (const o of sqliteOffers) {
      const mappedData = {
        name: o.name,
        buyProductId: productMap[o.buy_product_id],
        buyQuantity: o.buy_quantity,
        freeProductId: productMap[o.free_product_id],
        freeQuantity: o.free_quantity,
        isActive: !!o.is_active,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (!mappedData.buyProductId || !mappedData.freeProductId) continue;

      let mongoOffer = await mongoDb.collection('offers').findOne({ name: o.name });
      if (!mongoOffer) {
        await mongoDb.collection('offers').insertOne(mappedData);
      }
    }

    // 6. Godown Stock
    console.log('Syncing Godown Stock...');
    const sqliteGodownStock = db.prepare('SELECT * FROM godown_stock').all();
    for (const s of sqliteGodownStock) {
      const mappedData = {
        productId: productMap[s.product_id],
        casesAvailable: s.cases_available,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (mappedData.productId) {
        await mongoDb.collection('godownstocks').replaceOne(
          { productId: mappedData.productId },
          mappedData,
          { upsert: true }
        );
      }
    }

    // 7. Truck Stock
    console.log('Syncing Truck Stock...');
    const sqliteTruckStock = db.prepare('SELECT * FROM truck_stock').all();
    for (const s of sqliteTruckStock) {
      const mappedData = {
        truckId: truckMap[s.truck_id],
        productId: productMap[s.product_id],
        casesAvailable: s.cases_available,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (mappedData.truckId && mappedData.productId) {
        await mongoDb.collection('truckstocks').replaceOne(
          { truckId: mappedData.truckId, productId: mappedData.productId },
          mappedData,
          { upsert: true }
        );
      }
    }

    // 8. Expenses
    console.log('Syncing Expenses...');
    const sqliteExpenses = db.prepare('SELECT * FROM expenses').all();
    for (const e of sqliteExpenses) {
      const mappedData = {
        truckId: truckMap[e.truck_id],
        date: parseDate(e.date),
        description: e.description,
        amount: e.amount,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (mappedData.truckId) {
        await mongoDb.collection('expenses').insertOne(mappedData);
      }
    }

    // 9. Orders & Order Items
    console.log('Syncing Orders...');
    const sqliteOrders = db.prepare('SELECT * FROM orders').all();
    for (const o of sqliteOrders) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
      const mappedItems = items.map(item => {
        const pId = productMap[item.productId] || productMap[item.product_id];
        return {
          productId: pId,
          quantity: item.quantity,
          isFree: !!item.is_free,
          customPrice: item.custom_price || null
        };
      }).filter(i => i.productId);

      const mappedData = {
        customerId: customerMap[o.customer_id],
        truckId: truckMap[o.truck_id],
        date: parseDate(o.date),
        totalAmount: o.total_amount,
        paymentMode: o.payment_mode,
        isArchived: !!o.is_archived,
        items: mappedItems,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (mappedData.customerId && mappedData.truckId) {
        await mongoDb.collection('orders').insertOne(mappedData);
      }
    }

    console.log('Syncing Audit Logs...');
    const sqliteAudit = db.prepare('SELECT * FROM audit_log').all();
    for (const a of sqliteAudit) {
      await mongoDb.collection('auditlogs').insertOne({
        action: a.action,
        entityType: a.entity_type,
        entityId: String(a.entity_id),
        entityName: a.entity_name,
        details: a.details,
        timestamp: parseDate(a.timestamp),
        createdAt: new Date()
      });
    }

    console.log('🎉 Migration Complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.close();
    db.close();
  }
}

migrate();
