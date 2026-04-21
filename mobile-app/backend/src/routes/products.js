const express = require('express');
const router = express.Router();
const { Product, GodownStock, TruckStock, Offer, Order } = require('../models');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: 1 });
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PATCH /api/products/:id
router.patch('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await GodownStock.deleteMany({ productId: req.params.id });
    await TruckStock.deleteMany({ productId: req.params.id });
    await Offer.deleteMany({ $or: [{ buyProductId: req.params.id }, { freeProductId: req.params.id }] });
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

module.exports = router;
