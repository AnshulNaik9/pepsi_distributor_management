const { MongoClient, ObjectId } = require('mongodb');

async function finalRepair() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('distrisys');
    console.log('✅ Connected for Final Re-Link');

    // 1. Build Mappings from New Data
    const products = await db.collection('products').find().toArray();
    const prodMap = {}; // numeric id -> ObjectId
    products.forEach(p => { if(p.id) prodMap[String(p.id)] = p._id; });

    const routes = await db.collection('routes').find().toArray();
    const routeMap = {}; // numeric id -> ObjectId
    routes.forEach(r => { if(r.id) routeMap[String(r.id)] = r._id; });

    const trucks = await db.collection('trucks').find().toArray();
    const truckMap = {}; // numeric id -> ObjectId
    trucks.forEach(t => { if(t.id) truckMap[String(t.id)] = t._id; });

    // 2. Fix Customers (Numeric routeId)
    const customers = await db.collection('customers').find().toArray();
    for (const c of customers) {
      const sqlId = String(c.routeId);
      if (routeMap[sqlId]) {
        await db.collection('customers').updateOne({ _id: c._id }, { $set: { routeId: routeMap[sqlId] } });
      }
    }
    console.log('Fixed Customers');

    // 3. Fix Godown Stock (Numeric productId OR old String productId)
    const godown = await db.collection('godownstocks').find().toArray();
    for (const s of godown) {
      // Logic: if current productId is not a valid ObjectId belonging to a current product, 
      // check _sqliteId
      const currentPid = s.productId ? s.productId.toString() : null;
      const isCurrentValid = products.some(p => p._id.toString() === currentPid);
      
      if (!isCurrentValid) {
        const sqlId = String(s._sqliteId || s.productId);
        if (prodMap[sqlId]) {
          await db.collection('godownstocks').updateOne({ _id: s._id }, { $set: { productId: prodMap[sqlId] } });
        }
      }
    }
    console.log('Fixed Godown Stock');

    // 4. Fix Truck Stock
    const truckStock = await db.collection('truckstocks').find().toArray();
    for (const s of truckStock) {
      const updates = {};
      
      const currentPid = s.productId ? s.productId.toString() : null;
      const isPValid = products.some(p => p._id.toString() === currentPid);
      if (!isPValid) {
        const sqlId = String(s._sqliteId || s.productId || s.product_id);
        if (prodMap[sqlId]) updates.productId = prodMap[sqlId];
      }

      const currentTid = s.truckId ? s.truckId.toString() : null;
      const isTValid = trucks.some(t => t._id.toString() === currentTid);
      if (!isTValid) {
        const sqlId = String(s.truckId || s.truck_id);
        if (truckMap[sqlId]) updates.truckId = truckMap[sqlId];
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('truckstocks').updateOne({ _id: s._id }, { $set: updates });
      }
    }
    console.log('Fixed Truck Stock');

    console.log('🎉 SYSTEM RESTORED. Please refresh Port 8081.');
  } finally {
    await client.close();
  }
}

finalRepair();
