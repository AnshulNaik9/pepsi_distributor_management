const express = require('express');
const router = express.Router();
const { Route, Customer, AuditLog } = require('../models');

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: 1 });
    res.json(routes);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/routes
router.post('/', async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (e) {
    res.status(400).json({ message: 'Bad Request' });
  }
});

// DELETE /api/routes/:id
router.delete('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const activeCustomers = await Customer.find({ routeId: req.params.id, isDeleted: false });
    if (activeCustomers.length > 0) {
      return res.status(400).json({
        message: `Cannot delete route with ${activeCustomers.length} active customer(s). Reassign or delete them first.`
      });
    }

    await Route.findByIdAndDelete(req.params.id);
    await AuditLog.create({
      action: 'DELETE_ROUTE',
      entityType: 'route',
      entityId: req.params.id,
      entityName: route.name
    });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

module.exports = router;
