const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  isFree: { type: Boolean, default: false },
  customPrice: { type: Number, default: null }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  date: { type: Date, default: Date.now },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, required: true },
  isArchived: { type: Boolean, default: false },
  items: [orderItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
