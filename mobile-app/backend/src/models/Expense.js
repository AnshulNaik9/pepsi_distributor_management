const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  amount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
