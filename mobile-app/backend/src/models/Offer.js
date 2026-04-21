const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  buyProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyQuantity: { type: Number, required: true },
  freeProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  freeQuantity: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
