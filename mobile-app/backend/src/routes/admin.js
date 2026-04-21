const express = require('express');
const router = express.Router();
const { Order, Expense, Customer, Route, Product, MonthlySnapshot, AuditLog } = require('../models');

// GET /api/admin/export-report
router.get('/export-report', async (req, res) => {
  try {
    const { filterMode, fromDate, toDate, selectedDate } = req.query;
    const orders = await Order.find().populate('customerId').populate('items.productId').sort({ date: -1 });
    const expenses = await Expense.find().sort({ date: -1 });

    const filterByDate = (date) => {
      const d = new Date(date);
      if (filterMode === 'all') return true;
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      if (filterMode === 'today') return d >= todayStart && d <= todayEnd;
      if (filterMode === 'yesterday') {
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        const s = new Date(yest); s.setHours(0,0,0,0);
        const e = new Date(yest); e.setHours(23,59,59,999);
        return d >= s && d <= e;
      }
      if (filterMode === 'selectedDate' && selectedDate) {
        const s = new Date(selectedDate); s.setHours(0,0,0,0);
        const e = new Date(selectedDate); e.setHours(23,59,59,999);
        return d >= s && d <= e;
      }
      if (fromDate) { const s = new Date(fromDate); s.setHours(0,0,0,0); if (d < s) return false; }
      if (toDate) { const e = new Date(toDate); e.setHours(23,59,59,999); if (d > e) return false; }
      return true;
    };

    const fo = orders.filter(o => filterByDate(o.date));
    const fe = expenses.filter(e => filterByDate(e.date));

    const totalSales = fo.reduce((s, o) => s + o.totalAmount, 0);
    const totalExp = fe.reduce((s, e) => s + e.amount, 0);

    res.json({
      orders: fo.map(o => ({
        ...o.toObject(),
        customer: o.customerId,
        items: o.items.map(i => ({ ...i.toObject(), product: i.productId }))
      })),
      expenses: fe,
      summary: { totalSales, totalExpenses: totalExp, netProfit: totalSales - totalExp }
    });
  } catch (e) {
    res.status(500).json({ message: 'Export failed' });
  }
});

// POST /api/admin/monthly-reset
router.post('/monthly-reset', async (req, res) => {
  try {
    const month = req.body.month || getCurrentMonth();
    const customers = await Customer.find({ isDeleted: false });
    const orders = await Order.find();

    const snapshots = [];
    for (const customer of customers) {
      const customerOrders = orders.filter(o => {
        const orderMonth = `${new Date(o.date).getFullYear()}-${String(new Date(o.date).getMonth() + 1).padStart(2, '0')}`;
        return o.customerId.toString() === customer._id.toString() && orderMonth === month;
      });
      const totalPurchases = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const snapshot = await MonthlySnapshot.create({
        month,
        customerId: customer._id,
        customerName: customer.name,
        totalPurchases,
        orderCount: customerOrders.length
      });
      snapshots.push(snapshot);
    }

    res.json({ success: true, month, snapshotsCreated: snapshots.length });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admin/monthly-history
router.get('/monthly-history', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month query parameter is required' });
    const history = await MonthlySnapshot.find({ month }).sort({ totalPurchases: -1 });
    res.json(history);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// GET /api/admin/available-months
router.get('/available-months', async (req, res) => {
  try {
    const months = await MonthlySnapshot.distinct('month');
    res.json(months.sort().reverse());
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// GET /api/admin/deleted-orders
router.get('/deleted-orders', async (req, res) => {
  try {
    const rows = await AuditLog.find({ action: 'DELETE_ORDER' }).sort({ timestamp: -1 });
    const result = rows.map(row => {
      let parsedDetails = {};
      try { parsedDetails = row.details ? JSON.parse(row.details) : {}; } catch {}
      return { id: row._id, deletedAt: row.timestamp, action: row.action, ...parsedDetails };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// GET /api/reports/monthly-csv (returns JSON for mobile)
router.get('/monthly-csv', async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    const allOrders = await Order.find().populate('customerId').populate('items.productId');
    const allProducts = await Product.find();
    const allCustomers = await Customer.find();
    const allRoutes = await Route.find();

    const monthOrders = allOrders.filter(o => {
      const d = new Date(o.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
    });

    const totalRevenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      month,
      totalRevenue,
      totalOrders: monthOrders.length,
      uniqueCustomers: new Set(monthOrders.map(o => o.customerId?._id?.toString())).size,
      totalProducts: allProducts.length,
      totalRoutes: allRoutes.length
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = router;
