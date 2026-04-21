const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true }
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

module.exports = mongoose.model('Route', routeSchema);
