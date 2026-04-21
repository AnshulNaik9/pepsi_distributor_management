const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, default: null },
  price: { type: Number, required: true },
  unit: { type: String, default: 'ltr' },
  quantityPerUnit: { type: String, default: '1' },
  itemsPerCase: { type: Number, default: 1 },
  category: {
    type: String,
    enum: ['2_25_ltr', '1_ltr', '750_ml', '400_ml', 'others'],
    default: 'others'
  },
  purchasePrice: { type: Number, default: 0 }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      return ret;
    }
  },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Product', productSchema);
