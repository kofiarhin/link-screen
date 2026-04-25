const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    _id: String,
    hostToken: { type: String, required: true },
    hostSocketId: { type: String, default: null },
    viewerSocketId: { type: String, default: null },
    status: {
      type: String,
      enum: ['created', 'waiting', 'connected', 'ended'],
      default: 'created',
    },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
