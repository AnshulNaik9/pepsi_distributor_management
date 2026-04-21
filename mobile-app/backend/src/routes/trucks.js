const express = require('express');
const router = express.Router();
const { Truck, TruckStock, GodownStock, AuditLog } = require('../models');

// GET /api/trucks
router.get('/', async (req, res) => {
  try {
    const trucks = await Truck.find().sort({ createdAt: 1 });
    res.json(trucks);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/trucks
router.post('/', async (req, res) => {
  try {
    const truck = await Truck.create(req.body);
    res.status(201).json(truck);
  } catch (e) {
    res.status(400).json({ message: 'Bad request' });
  }
});

// GET /api/trucks/:id/stock
router.get('/:id/stock', async (req, res) => {
  try {
    const stock = await TruckStock.find({ truckId: req.params.id }).populate('productId');
    const formatted = stock.map(s => {
      const doc = s.toObject ? s.toObject() : s;
      return {
        _id: doc._id.toString(),
        id: doc._id.toString(),
        truckId: doc.truckId.toString(),
        productId: doc.productId?._id?.toString() || doc.productId?.toString(),
        casesAvailable: doc.casesAvailable,
        product: doc.productId
      };
    });
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/trucks/load
router.post('/load', async (req, res) => {
  try {
    const { truckId, items } = req.body;
    for (const item of items) {
      console.log(`[DEBUG_LOAD] Searching for Godown Product: ${item.productId}`);
      const gStock = await GodownStock.findOne({ productId: item.productId });
      if (!gStock || gStock.casesAvailable < item.quantity - 0.0001) {
        console.log(`[LOAD ERROR] Not enough stock in godown. ProductId: ${item.productId}, Avail: ${gStock?.casesAvailable}, Req: ${item.quantity}`);
        return res.status(400).json({ message: `Not enough stock in godown for product ${item.productId}. Available: ${gStock?.casesAvailable || 0}, Requested: ${item.quantity}` });
      }
      gStock.casesAvailable -= item.quantity;
      await gStock.save();

      // Increase truck stock
      const tStock = await TruckStock.findOne({ truckId, productId: item.productId });
      if (tStock) {
        tStock.casesAvailable += item.quantity;
        await tStock.save();
      } else {
        await TruckStock.create({ truckId, productId: item.productId, casesAvailable: item.quantity });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST /api/trucks/return
router.post('/return', async (req, res) => {
  try {
    const { truckId, items } = req.body;
    console.log(`[RETURN REQUEST] Truck: ${truckId}, Items: ${items.length}`);
    for (const item of items) {
      console.log(`[DEBUG_RETURN] Searching for Truck: ${truckId}, Product: ${item.productId}`);
      const tStock = await TruckStock.findOne({ truckId, productId: item.productId });
      
      // If we're very close to the requested amount (within 0.01), just adjust quantity to match what's available
      let qtyToReturn = item.quantity;
      if (tStock && tStock.casesAvailable < qtyToReturn && tStock.casesAvailable > qtyToReturn - 0.05) {
        qtyToReturn = tStock.casesAvailable;
      }

      if (!tStock || tStock.casesAvailable < qtyToReturn - 0.0001) {
        console.log(`[RETURN ERROR] Insufficient stock. Truck: ${truckId}, Product: ${item.productId}, Avail: ${tStock?.casesAvailable}, Req: ${qtyToReturn}`);
        return res.status(400).json({ message: `Not enough stock in truck for product ${item.productId}. Available: ${tStock?.casesAvailable || 0}, Requested: ${qtyToReturn}` });
      }

      const actualDeduction = qtyToReturn;
      tStock.casesAvailable -= actualDeduction;
      if (tStock.casesAvailable < 0.0001) tStock.casesAvailable = 0; // Guard against -0.000000001
      await tStock.save();

      // Increase godown stock
      const gStock = await GodownStock.findOne({ productId: item.productId });
      if (gStock) {
        gStock.casesAvailable += actualDeduction;
        await gStock.save();
      } else {
        await GodownStock.create({ productId: item.productId, casesAvailable: actualDeduction });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/trucks/:id
router.delete('/:id', async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ message: 'Truck not found' });

    const stock = await TruckStock.find({ truckId: req.params.id });
    const reassignedItems = [];

    for (const item of stock) {
      if (item.casesAvailable > 0) {
        reassignedItems.push({ productId: item.productId, quantity: item.casesAvailable });
        const gStock = await GodownStock.findOne({ productId: item.productId });
        if (gStock) {
          gStock.casesAvailable += item.casesAvailable;
          await gStock.save();
        } else {
          await GodownStock.create({ productId: item.productId, casesAvailable: item.casesAvailable });
        }
      }
    }

    await TruckStock.deleteMany({ truckId: req.params.id });
    await Truck.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'DELETE_TRUCK',
      entityType: 'truck',
      entityId: req.params.id,
      entityName: truck.vehicleNumber,
      details: reassignedItems.length > 0
        ? `Reassigned ${reassignedItems.reduce((s, i) => s + i.quantity, 0)} cases back to godown`
        : 'No load to reassign'
    });

    res.json({ success: true, reassignedItems });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
