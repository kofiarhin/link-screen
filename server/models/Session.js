const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    _id: String,
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
