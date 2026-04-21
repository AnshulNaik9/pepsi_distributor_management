const express = require('express');
const router = express.Router();
const { Customer, Order, AuditLog } = require('../models');

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.routeId) filter.routeId = req.query.routeId;
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (e) {
    res.status(400).json({ message: 'Bad Request' });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST /api/customers/:id/pay-credit
router.post('/:id/pay-credit', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    customer.creditBalance = 0;
    await customer.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// DELETE /api/customers/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.isDeleted = true;
    await customer.save();

    await AuditLog.create({
      action: 'DELETE_CUSTOMER',
      entityType: 'customer',
      entityId: req.params.id,
      entityName: customer.name,
      details: `Credit balance at deletion: ₹${customer.creditBalance}`
    });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// GET /api/customers/:id/orders
router.get('/:id/orders', async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.id })
      .populate('customerId')
      .populate('items.productId')
      .sort({ date: -1 });
    
    const formatted = orders.map(o => ({
      ...o.toObject(),
      customer: o.customerId,
      items: o.items.map(item => ({
        ...item.toObject(),
        product: item.productId
      }))
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/customers/:id/reset-monthly
router.post('/:id/reset-monthly', async (req, res) => {
  try {
    // Reset monthly related data for customer
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

module.exports = router;
