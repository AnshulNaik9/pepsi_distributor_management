const express = require('express');
const router = express.Router();
const { GodownStock, TruckStock, AuditLog, Product } = require('../models');

// GET /api/godown-stock
router.get('/', async (req, res) => {
  try {
    const stock = await GodownStock.find().populate('productId');
    // Transform to match web app format
    const formatted = stock.map(s => {
      const doc = s.toObject ? s.toObject() : s;
      return {
        _id: doc._id.toString(),
        id: doc._id.toString(),
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

// POST /api/godown-stock
router.post('/', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const existing = await GodownStock.findOne({ productId });
    if (existing) {
      existing.casesAvailable += quantity;
      await existing.save();
    } else {
      await GodownStock.create({ productId, casesAvailable: quantity });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST /api/inventory/damage
router.post('/damage', async (req, res) => {
  try {
    const { productId, truckId, quantity } = req.body;
    
    if (!truckId || truckId === '0') {
      // Damage in godown
      const gStock = await GodownStock.findOne({ productId });
      if (!gStock || gStock.casesAvailable < quantity) {
        return res.status(400).json({ message: `Not enough stock in godown. Available: ${gStock?.casesAvailable || 0}` });
      }
      gStock.casesAvailable -= quantity;
      await gStock.save();
    } else {
      // Damage in truck
      const tStock = await TruckStock.findOne({ truckId, productId });
      if (!tStock || tStock.casesAvailable < quantity) {
        return res.status(400).json({ message: `Not enough stock in truck. Available: ${tStock?.casesAvailable || 0}` });
      }
      tStock.casesAvailable -= quantity;
      await tStock.save();
    }

    const product = await Product.findById(productId);
    await AuditLog.create({
      action: 'DAMAGE_STOCK',
      entityType: 'inventory',
      entityId: productId,
      entityName: product?.name || `Product #${productId}`,
      details: JSON.stringify({ truckId, quantity })
    });

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
