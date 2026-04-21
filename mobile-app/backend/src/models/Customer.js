const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  creditBalance: { type: Number, default: 0 },
  address: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  hasSpecialDiscount: { type: Boolean, default: false }
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

module.exports = mongoose.model('Customer', customerSchema);
