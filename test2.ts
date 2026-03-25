import { storage } from './server/storage.js';

async function run() {
  try {
    const trucks = await storage.getTrucks();
    if (trucks.length === 0) {
      console.log("No trucks");
      return;
    }
    const truckId = trucks[0].id;

    const gStock = await storage.getGodownStock();
    if (gStock.length === 0) {
      console.log("No stock");
      return;
    }
    
    // Pick the first stock that has > 0 cases
    const availableStock = gStock.find(s => s.casesAvailable > 0);
    if (!availableStock) {
      console.log("No available stock in godown");
      return;
    }

    const productId = availableStock.productId;
    const quantity = 1;

    console.log(`Attempting to load 1 case of product ${productId} to truck ${truckId}`);
    
    await storage.loadTruck({
      truckId,
      items: [
        { productId, quantity }
      ]
    });
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
