const { MongoClient, ObjectId } = require('mongodb');
const Database = require('better-sqlite3');

async function migrateStock() {
  const mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
  const sqliteDb = new Database('sqlite.db');

  try {
    await mongoClient.connect();
    const mongoDb = mongoClient.db('distrisys');
    console.log('✅ Connected to both databases');

    // 1. Wipe old stock
    console.log('Clearing old stock data...');
    await mongoDb.collection('godownstocks').deleteMany({});
    await mongoDb.collection('truckstocks').deleteMany({});

    // 2. Map Products
    const mongoProds = await mongoDb.collection('products').find().toArray();
    const prodMap = {}; // sqlite id -> mongo _id
    mongoProds.forEach(p => { if(p.id) prodMap[String(p.id)] = p._id; });

    // 3. Map Trucks
    const mongoTrucks = await mongoDb.collection('trucks').find().toArray();
    const truckMap = {}; // sqlite id -> mongo _id
    mongoTrucks.forEach(t => { if(t.id) truckMap[String(t.id)] = t._id; });

    // 4. Migrate Godown Stock
    console.log('Migrating Godown Stock...');
    const gStock = sqliteDb.prepare('SELECT * FROM godown_stock').all();
    let gCount = 0;
    for (const s of gStock) {
      // Drizzle schemas often use camelCase or snake_case depending on config
      const pid = String(s.product_id || s.productId);
      if (prodMap[pid]) {
        await mongoDb.collection('godownstocks').insertOne({
          productId: prodMap[pid],
          casesAvailable: s.cases_available || s.casesAvailable,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        gCount++;
      }
    }
    console.log(`- Migrated ${gCount} godown records`);

    // 5. Migrate Truck Stock
    console.log('Migrating Truck Stock...');
    const tStock = sqliteDb.prepare('SELECT * FROM truck_stock').all();
    let tCount = 0;
    for (const s of tStock) {
      const pid = String(s.product_id || s.productId);
      const tid = String(s.truck_id || s.truckId);
      if (prodMap[pid] && truckMap[tid]) {
        await mongoDb.collection('truckstocks').insertOne({
          truckId: truckMap[tid],
          productId: prodMap[pid],
          casesAvailable: s.cases_available || s.casesAvailable,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        tCount++;
      }
    }
    console.log(`- Migrated ${tCount} truck stock records`);

    console.log('🎉 STOCK MIGRATION COMPLETE! Refresh Port 8081.');
  } finally {
    await mongoClient.close();
    sqliteDb.close();
  }
}

migrateStock();
