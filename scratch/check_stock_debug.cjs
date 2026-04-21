const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/distrisys');
  try {
    await client.connect();
    const db = client.db();
    const productId = new ObjectId('69e2835e3002e6de0d2281f8');
    
    const product = await db.collection('products').findOne({ _id: productId });
    console.log('Product:', product);
    
    const godown = await db.collection('godownstocks').findOne({ productId });
    console.log('Godown Stock:', godown);
    
    const trucks = await db.collection('truckstocks').find({ productId }).toArray();
    console.log('Truck Stocks:', trucks);
    
  } finally {
    await client.close();
  }
}

check();
