const mongoose = require('mongoose');

const monthlySnapshotSchema = new mongoose.Schema({
  month: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  totalPurchases: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  snapshotDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('MonthlySnapshot', monthlySnapshotSchema);
