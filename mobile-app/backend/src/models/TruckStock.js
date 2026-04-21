const mongoose = require('mongoose');

const truckStockSchema = new mongoose.Schema({
  truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  casesAvailable: { type: Number, default: 0 }
}, { timestamps: true });

truckStockSchema.index({ truckId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('TruckStock', truckStockSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.productId && ret.productId._id) {
       ret.productId = ret.productId._id.toString();
    }
    return ret;
  }
}).set('toObject', { virtuals: true }));
