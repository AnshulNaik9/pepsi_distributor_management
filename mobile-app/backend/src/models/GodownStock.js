const mongoose = require('mongoose');

const godownStockSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  casesAvailable: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('GodownStock', godownStockSchema.set('toJSON', {
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
