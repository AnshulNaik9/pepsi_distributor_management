const { register } = require('esbuild-register/dist/node');
register();
const { storage } = require('./server/storage.ts');

(async () => {
  const payload = {
    customerId: 48,
    truckId: 2,
    paymentMode: 'Cash',
    items: [{ productId: 11, quantity: 2 }]
  };
  
  try {
    const order = await storage.checkout(payload);
    console.log("Storage checkOut result:", JSON.stringify(order, null, 2));
  } catch(e) {
    console.error("Error evaluating storage.ts:", e);
  }
})();
